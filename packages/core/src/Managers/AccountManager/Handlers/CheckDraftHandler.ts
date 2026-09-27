import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadVoiceGuideRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadVoiceGuideRequest";
import { VoiceGuideLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/VoiceGuideLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import { DRAFT_CHECK_MAX_LENGTH } from "../../../Common/VoiceGuideRules";
import type { IDraftCheckEngine } from "../../../Engines/DraftCheckEngine/IDraftCheckEngine";
import { EvaluateDraftRequest } from "../../../Engines/DraftCheckEngine/Requests/EvaluateDraftRequest";
import { DraftEvaluatedResponse } from "../../../Engines/DraftCheckEngine/Responses/DraftEvaluatedResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { CheckDraftRequest } from "../Requests/CheckDraftRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { DraftCheckResponse } from "../Responses/DraftCheckResponse";
import { unavailable } from "../unavailable";

type Result = DraftCheckResponse | ActionForbiddenResponse | AccountUnavailableResponse;

// The caller's own guide feeds the check, so the rule is the guide's: a member, or an
// agent whose token may read the guide (`voice.view`).
export class CheckDraftHandler implements IHandler<CheckDraftRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly draftCheck: IDraftCheckEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: CheckDraftRequest): Promise<Result> {
    const { correlationId, actor, bodyMd, timestamp } = request;
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
    const guide = await this.profiles.load(
      new LoadVoiceGuideRequest(actor.profile.id, context),
    );
    if (!(guide instanceof VoiceGuideLoadedResponse)) {
      return unavailable(correlationId, guide, "profiles.load");
    }
    const evaluated = await this.draftCheck.evaluate(
      new EvaluateDraftRequest(
        bodyMd.slice(0, DRAFT_CHECK_MAX_LENGTH),
        guide.guideMd,
        context,
      ),
    );
    if (!(evaluated instanceof DraftEvaluatedResponse)) {
      return unavailable(correlationId, evaluated, "draftCheck.evaluate");
    }
    return new DraftCheckResponse(correlationId, evaluated.warnings);
  }
}
