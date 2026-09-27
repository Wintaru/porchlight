import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadVoiceGuideRevisionsRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadVoiceGuideRevisionsRequest";
import { VoiceGuideRevisionsLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/VoiceGuideRevisionsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { ListVoiceGuideRevisionsRequest } from "../Requests/ListVoiceGuideRevisionsRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { VoiceGuideRevisionsResponse } from "../Responses/VoiceGuideRevisionsResponse";
import { unavailable } from "../unavailable";

type Result =
  VoiceGuideRevisionsResponse | ActionForbiddenResponse | AccountUnavailableResponse;

// Whoever may read the guide may read its history: the same rule, `voice.view`.
export class ListVoiceGuideRevisionsHandler implements IHandler<
  ListVoiceGuideRevisionsRequest,
  Result
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListVoiceGuideRevisionsRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
    const context = { correlationId, timestamp };
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
    const loaded = await this.profiles.load(
      new LoadVoiceGuideRevisionsRequest(actor.profile.id, context),
    );
    if (!(loaded instanceof VoiceGuideRevisionsLoadedResponse)) {
      return unavailable(correlationId, loaded, "profiles.load");
    }
    return new VoiceGuideRevisionsResponse(correlationId, loaded.revisions);
  }
}
