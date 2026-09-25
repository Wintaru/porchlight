import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadVoiceGuide } from "../loadVoiceGuide";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { GetVoiceGuideRequest } from "../Requests/GetVoiceGuideRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { VoiceGuideResponse } from "../Responses/VoiceGuideResponse";

type Result = VoiceGuideResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class GetVoiceGuideHandler implements IHandler<GetVoiceGuideRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: GetVoiceGuideRequest): Promise<Result> {
    const { correlationId, actor } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "voice.view",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "voice.view granted to a visitor",
      );
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
