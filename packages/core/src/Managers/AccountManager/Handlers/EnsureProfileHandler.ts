import type { IInviteAccessor } from "../../../Accessors/InviteAccessor/IInviteAccessor";
import { RedeemInviteRequest } from "../../../Accessors/InviteAccessor/Requests/RedeemInviteRequest";
import { InviteNotRedeemableResponse } from "../../../Accessors/InviteAccessor/Responses/InviteNotRedeemableResponse";
import { InviteAccessFailedResponse } from "../../../Accessors/InviteAccessor/Responses/InviteAccessFailedResponse";
import { ReleaseInviteRequest } from "../../../Accessors/InviteAccessor/Requests/ReleaseInviteRequest";
import { InviteReleasedResponse } from "../../../Accessors/InviteAccessor/Responses/InviteReleasedResponse";
import { InviteRedeemedResponse } from "../../../Accessors/InviteAccessor/Responses/InviteRedeemedResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSignUpPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SignUpPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { NewProfile } from "../../../Accessors/ProfileAccessor/NewProfile";
import { CountProfilesRequest } from "../../../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { RemoveOrphanAuthUserRequest } from "../../../Accessors/ProfileAccessor/Requests/RemoveOrphanAuthUserRequest";
import { StoreNewProfileRequest } from "../../../Accessors/ProfileAccessor/Requests/StoreNewProfileRequest";
import { ProfileAccessFailedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileAccessFailedResponse";
import { ProfileCountResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileCountResponse";
import { ProfileHandleTakenResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileHandleTakenResponse";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { OrphanAuthUserRemovedResponse } from "../../../Accessors/ProfileAccessor/Responses/OrphanAuthUserRemovedResponse";
import { ProfileStoredResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { DeriveHandleRequest } from "../../../Engines/PermissionEngine/Requests/DeriveHandleRequest";
import { HandleDerivedResponse } from "../../../Engines/PermissionEngine/Responses/HandleDerivedResponse";
import type { EnsureProfileOptions } from "../EnsureProfileOptions";
import { inviteTokenHash } from "../inviteTokenHash";
import { isSiteAdminEmail } from "../isSiteAdminEmail";
import type { EnsureProfileRequest } from "../Requests/EnsureProfileRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { ProfileResponse } from "../Responses/ProfileResponse";
import { SignUpClosedResponse } from "../Responses/SignUpClosedResponse";

// How many handle candidates to try before giving up. Every candidate after the first
// carries a numeric suffix, so this many collisions means something else is wrong.
const MAX_HANDLE_ATTEMPTS = 20;

type Standing = Pick<NewProfile, "role" | "trustLevel">;

const FIRST_ADMIN: Standing = { role: "admin", trustLevel: "trusted" };
const NEW_MEMBER: Standing = { role: "member", trustLevel: "probation" };

// First sign-in creates the profile; every later one finds it. The configured admin
// email becomes admin; with none configured, the first profile ever does (SPEC.md §4).
// The handle comes from the Engine and is retried with the next candidate while the
// store says it is taken.
// `site_config.sign_up` (D20, #12) only gates an ordinary new member: the site's own
// bootstrap admin and its configured admin email always get in, or the settings page
// that closes sign-up could never be reopened.
// A first sign-in refused before any invite is spent (a closed site, or an invite-only
// site with no invite cookie) removes the auth user Supabase Auth made for it (#92).
export class EnsureProfileHandler implements IHandler<
  EnsureProfileRequest,
  ProfileResponse | SignUpClosedResponse | AccountUnavailableResponse
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly invites: IInviteAccessor,
    private readonly options: EnsureProfileOptions,
  ) {}

  async handle(
    request: EnsureProfileRequest,
  ): Promise<ProfileResponse | SignUpClosedResponse | AccountUnavailableResponse> {
    const { correlationId, identity } = request;
    const context: RequestContext = { correlationId };

    const existing = await this.profiles.load(
      new LoadProfileByIdRequest(identity.userId, context),
    );
    if (existing instanceof ProfileLoadedResponse) {
      return new ProfileResponse(correlationId, existing.profile);
    }
    if (!(existing instanceof ProfileNotFoundResponse)) {
      return unavailable(correlationId, existing, "load");
    }

    const counted = await this.profiles.load(new CountProfilesRequest(context));
    if (!(counted instanceof ProfileCountResponse)) {
      return unavailable(correlationId, counted, "load");
    }
    const standing = this.standingFor(counted.count, identity.email);

    if (standing === NEW_MEMBER) {
      const signUp = await this.siteConfig.load(new LoadSignUpPolicyRequest(context));
      if (!(signUp instanceof SignUpPolicyLoadedResponse)) {
        return unavailable(correlationId, signUp, "load");
      }
      if (signUp.policy === "closed") {
        return this.refuse(identity.userId, correlationId);
      }
      // Invite-only: a live link lets a friend in at the level the admin chose, and
      // spends one use (#25). `open` ignores invites (SPEC.md §4).
      if (signUp.policy === "invite") {
        return this.joinByInvite(request, context);
      }
    }
    return this.storeProfile(identity, standing, correlationId);
  }

  // Spends the use first, so two friends on a one-use link cannot both get in, and gives
  // it back if the profile then fails to store. A second request for the same person
  // (a double submit, a reloaded callback) finds the use gone; it answers the profile
  // the first request made rather than refusing someone who is already in.
  private async joinByInvite(
    request: EnsureProfileRequest,
    context: RequestContext,
  ): Promise<ProfileResponse | SignUpClosedResponse | AccountUnavailableResponse> {
    const { correlationId, identity, inviteToken } = request;
    if (inviteToken === null) {
      return this.refuse(identity.userId, correlationId);
    }
    const tokenHash = await inviteTokenHash(inviteToken);
    const redeemed = await this.invites.store(
      new RedeemInviteRequest(tokenHash, context),
    );
    // No removal here (#92 review): the use may be gone because another request for
    // this same person spent it a moment ago and is storing the profile now. Deleting
    // the auth user then would leave that profile with no way to sign in.
    if (redeemed instanceof InviteNotRedeemableResponse) {
      const made = await this.profiles.load(
        new LoadProfileByIdRequest(identity.userId, context),
      );
      return made instanceof ProfileLoadedResponse
        ? new ProfileResponse(correlationId, made.profile)
        : new SignUpClosedResponse(correlationId);
    }
    if (!(redeemed instanceof InviteRedeemedResponse)) {
      return unavailable(correlationId, redeemed, "invites.store");
    }
    const created = await this.storeProfile(
      identity,
      { role: "member", trustLevel: redeemed.trustLevel },
      correlationId,
    );
    if (!(created instanceof ProfileResponse)) {
      const released = await this.invites.store(
        new ReleaseInviteRequest(tokenHash, context),
      );
      if (!(released instanceof InviteReleasedResponse)) {
        console.error(
          `invite use not given back after a failed sign-in [${correlationId}]`,
          released,
        );
      }
    }
    return created;
  }

  // The `sign_up` rule said no to a first sign-in. The auth user Supabase Auth made for
  // it has no profile, so it goes: an invite email opened in another browser (the invite
  // cookie is in the first one) or Google on a closed site would otherwise leave an
  // account behind with every refusal. The accessor reads the profile again right before
  // the delete. If one exists by then, another request for the same person got in first
  // (a double submit, a reloaded callback, a second tab), and the answer is that
  // profile. A failed removal is logged; the refusal stands.
  private async refuse(
    userId: string,
    correlationId: string,
  ): Promise<ProfileResponse | SignUpClosedResponse> {
    const removed = await this.profiles.store(
      new RemoveOrphanAuthUserRequest(userId, { correlationId }),
    );
    if (removed instanceof ProfileLoadedResponse) {
      return new ProfileResponse(correlationId, removed.profile);
    }
    if (!(removed instanceof OrphanAuthUserRemovedResponse)) {
      console.error(
        `auth user not removed after a refused sign-in [${correlationId}]`,
        removed,
      );
    }
    return new SignUpClosedResponse(correlationId);
  }

  private async storeProfile(
    identity: EnsureProfileRequest["identity"],
    standing: Standing,
    correlationId: string,
  ): Promise<ProfileResponse | AccountUnavailableResponse> {
    const context: RequestContext = { correlationId };
    for (let attempt = 1; attempt <= MAX_HANDLE_ATTEMPTS; attempt += 1) {
      const derived = await this.permissions.transform(
        new DeriveHandleRequest(identity.email, identity.displayName, attempt, context),
      );
      if (!(derived instanceof HandleDerivedResponse)) {
        return unavailable(correlationId, derived, "transform");
      }
      const stored = await this.profiles.store(
        new StoreNewProfileRequest(
          {
            id: identity.userId,
            handle: derived.handle,
            displayName: identity.displayName,
            avatarUrl: identity.avatarUrl,
            ...standing,
          },
          context,
        ),
      );
      if (stored instanceof ProfileStoredResponse) {
        return new ProfileResponse(correlationId, stored.profile);
      }
      if (!(stored instanceof ProfileHandleTakenResponse)) {
        return unavailable(correlationId, stored, "store");
      }
    }
    return new AccountUnavailableResponse(
      correlationId,
      `no free handle for ${identity.userId} after ${String(MAX_HANDLE_ATTEMPTS)} attempts`,
    );
  }

  private standingFor(existingCount: number, email: string): Standing {
    return isSiteAdminEmail(this.options, existingCount, email)
      ? FIRST_ADMIN
      : NEW_MEMBER;
  }
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): AccountUnavailableResponse {
  const reason =
    response instanceof ProfileAccessFailedResponse ||
    response instanceof SiteConfigAccessFailedResponse ||
    response instanceof InviteAccessFailedResponse
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new AccountUnavailableResponse(correlationId, reason);
}
