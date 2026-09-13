import type { Actor } from "../../Common/Actor";
import type { RequestContext } from "../../Common/RequestContext";
import type { IPermissionEngine } from "../../Engines/PermissionEngine/IPermissionEngine";
import type { PermissionAction } from "../../Engines/PermissionEngine/PermissionAction";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import { EvaluatePermissionRequest } from "../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import { PermissionUnavailableResponse } from "../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import { AccountUnavailableResponse } from "./Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "./Responses/ActionForbiddenResponse";

// Every account handler that gates on a permission asks the same question first.
// Answers `undefined` when the actor may proceed, otherwise the response the handler
// returns as it is. The same shape as MediaManager's and CommentManager's own permit: a
// Manager may not import another Manager's folder, and three call sites here (Update,
// Export, Erase) are under the rule of three.
export async function permit(
  permissions: IPermissionEngine,
  actor: Actor,
  action: PermissionAction,
  subject: PermissionSubject,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<ActionForbiddenResponse | AccountUnavailableResponse | undefined> {
  const { correlationId } = context;
  const verdict = await permissions.evaluate(
    new EvaluatePermissionRequest(actor, action, subject, context),
  );
  if (verdict instanceof PermissionGrantedResponse) {
    return undefined;
  }
  if (verdict instanceof PermissionDeniedResponse) {
    return new ActionForbiddenResponse(correlationId, verdict.reason);
  }
  if (verdict instanceof PermissionUnavailableResponse) {
    return new AccountUnavailableResponse(correlationId, verdict.reason);
  }
  return new AccountUnavailableResponse(
    correlationId,
    `unexpected ${verdict.constructor.name} from evaluate`,
  );
}
