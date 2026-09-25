import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { StoreVoiceGuideRequest } from "../../../Accessors/ProfileAccessor/Requests/StoreVoiceGuideRequest";
import { VoiceGuideStoredResponse } from "../../../Accessors/ProfileAccessor/Responses/VoiceGuideStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import { VOICE_GUIDE_MAX_LENGTH } from "../../../Common/VoiceGuideRules";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadVoiceGuide } from "../loadVoiceGuide";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { UpdateVoiceGuideRequest } from "../Requests/UpdateVoiceGuideRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { VoiceGuideRejectedResponse } from "../Responses/VoiceGuideRejectedResponse";
import { VoiceGuideResponse } from "../Responses/VoiceGuideResponse";
import { unavailable } from "../unavailable";

type Result =
  | VoiceGuideResponse
  | VoiceGuideRejectedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// Permission, then the length, then the write. The answer is the guide as the agent
// will read it next, samples included, so a caller sees the result of its change.
export class UpdateVoiceGuideHandler implements IHandler<
  UpdateVoiceGuideRequest,
  Result
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: UpdateVoiceGuideRequest): Promise<Result> {
    const { correlationId, actor } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "voice.edit",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "voice.edit granted to a visitor",
      );
    }
    if (request.guideMd.length > VOICE_GUIDE_MAX_LENGTH) {
      return new VoiceGuideRejectedResponse(correlationId);
    }

    const guideMd = request.guideMd.trim() === "" ? null : request.guideMd;
    const stored = await this.profiles.store(
      new StoreVoiceGuideRequest(actor.profile.id, guideMd, context),
    );
    if (!(stored instanceof VoiceGuideStoredResponse)) {
      return unavailable(correlationId, stored, "profiles.store");
    }
    const guide = await loadVoiceGuide(
      this.profiles,
      this.posts,
      actor.profile.id,
      context,
    );
    return guide instanceof AccountUnavailableResponse
      ? guide
      : new VoiceGuideResponse(correlationId, guide);
  }
}
