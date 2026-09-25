import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSignUpPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SignUpPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { NewProfile } from "../../../Accessors/ProfileAccessor/NewProfile";
import { CountProfilesRequest } from "../../../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { StoreNewProfileRequest } from "../../../Accessors/ProfileAccessor/Requests/StoreNewProfileRequest";
import { ProfileAccessFailedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileAccessFailedResponse";
import { ProfileCountResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileCountResponse";
import { ProfileHandleTakenResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileHandleTakenResponse";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { ProfileStoredResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { DeriveHandleRequest } from "../../../Engines/PermissionEngine/Requests/DeriveHandleRequest";
import { HandleDerivedResponse } from "../../../Engines/PermissionEngine/Responses/HandleDerivedResponse";
import type { EnsureProfileOptions } from "../EnsureProfileOptions";
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
export class EnsureProfileHandler implements IHandler<
  EnsureProfileRequest,
  ProfileResponse | SignUpClosedResponse | AccountUnavailableResponse
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly siteConfig: ISiteConfigAccessor,
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
      if (signUp.policy !== "open") {
        return new SignUpClosedResponse(correlationId);
      }
    }

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

  // A configured admin email replaces the first-profile rule: otherwise a stranger who
  // signs in between the deploy and the owner's first sign-in becomes admin.
  private standingFor(existingCount: number, email: string): Standing {
    const adminEmail = this.options.adminEmail?.trim().toLowerCase();
    if (adminEmail !== undefined && adminEmail !== "") {
      return adminEmail === email.toLowerCase() ? FIRST_ADMIN : NEW_MEMBER;
    }
    return existingCount === 0 ? FIRST_ADMIN : NEW_MEMBER;
  }
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): AccountUnavailableResponse {
  const reason =
    response instanceof ProfileAccessFailedResponse ||
    response instanceof SiteConfigAccessFailedResponse
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new AccountUnavailableResponse(correlationId, reason);
}
