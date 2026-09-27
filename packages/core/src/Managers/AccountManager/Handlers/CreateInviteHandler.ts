import type { IInviteAccessor } from "../../../Accessors/InviteAccessor/IInviteAccessor";
import { StoreNewInviteRequest } from "../../../Accessors/InviteAccessor/Requests/StoreNewInviteRequest";
import { InviteStoredResponse } from "../../../Accessors/InviteAccessor/Responses/InviteStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { generateAnonymousSecret } from "../../../Utilities/anonymous/generateAnonymousSecret";
import { inviteTokenHash } from "../inviteTokenHash";
import { INVITE_MAX_DAYS, INVITE_MAX_USES } from "../InviteTerms";
import { permit } from "../permit";
import type { CreateInviteRequest } from "../Requests/CreateInviteRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { InviteMadeResponse } from "../Responses/InviteMadeResponse";
import { InviteRejectedResponse } from "../Responses/InviteRejectedResponse";
import { unavailable } from "../unavailable";

type Result =
  | InviteMadeResponse
  | InviteRejectedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

const MS_PER_DAY = 86_400_000;

function withinBounds(value: number | null, max: number): boolean {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= max);
}

// An admin makes a link (#25). The token is 256 random bits, the same as the anonymous
// secret, so a link cannot be guessed; only its hash is stored.
export class CreateInviteHandler implements IHandler<CreateInviteRequest, Result> {
  constructor(
    private readonly invites: IInviteAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: CreateInviteRequest): Promise<Result> {
    const { correlationId, actor, terms, timestamp } = request;
    const context = { correlationId, timestamp };
    const refused = await permit(
      this.permissions,
      actor,
      "invite.manage",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      return new AccountUnavailableResponse(
        correlationId,
        "invite.manage granted to a non-member",
      );
    }
    if (!withinBounds(terms.expiresInDays, INVITE_MAX_DAYS)) {
      return new InviteRejectedResponse(correlationId, "expiresInDays");
    }
    if (!withinBounds(terms.maxUses, INVITE_MAX_USES)) {
      return new InviteRejectedResponse(correlationId, "maxUses");
    }
    const token = generateAnonymousSecret();
    const stored = await this.invites.store(
      new StoreNewInviteRequest(
        {
          tokenHash: await inviteTokenHash(token),
          createdBy: actor.profile.id,
          expiresAt:
            terms.expiresInDays === null
              ? null
              : new Date(timestamp.getTime() + terms.expiresInDays * MS_PER_DAY),
          maxUses: terms.maxUses,
          trustLevel: terms.trustLevel,
        },
        context,
      ),
    );
    if (!(stored instanceof InviteStoredResponse)) {
      return unavailable(correlationId, stored, "invites.store");
    }
    return new InviteMadeResponse(correlationId, stored.invite, token);
  }
}
