import type { Actor } from "../../Common/Actor";
import type { RequestContext } from "../../Common/RequestContext";
import { EvaluatePermissionRequest } from "../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import { PermissionUnavailableResponse } from "../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import type { IPermissionEngine } from "../../Engines/PermissionEngine/IPermissionEngine";
import type { PermissionAction } from "../../Engines/PermissionEngine/PermissionAction";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import { ModerationForbiddenResponse } from "./Responses/ModerationForbiddenResponse";
import { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";

// Every handler's first move: ask the PermissionEngine, and translate its answer into
// this Manager's own Forbidden/Unavailable pair. `undefined` means proceed.
export async function permit(
  permissions: IPermissionEngine,
  actor: Actor,
  action: PermissionAction,
  subject: PermissionSubject,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<ModerationForbiddenResponse | ModerationUnavailableResponse | undefined> {
  const { correlationId } = context;
  const verdict = await permissions.evaluate(
    new EvaluatePermissionRequest(actor, action, subject, context),
  );
  if (verdict instanceof PermissionGrantedResponse) {
    return undefined;
  }
  if (verdict instanceof PermissionDeniedResponse) {
    return new ModerationForbiddenResponse(correlationId, verdict.reason);
  }
  if (verdict instanceof PermissionUnavailableResponse) {
    return new ModerationUnavailableResponse(correlationId, verdict.reason);
  }
  return new ModerationUnavailableResponse(
    correlationId,
    `unexpected ${verdict.constructor.name} from evaluate`,
  );
}
