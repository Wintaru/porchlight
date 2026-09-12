import type { Actor } from "../../Common/Actor";
import type { RequestContext } from "../../Common/RequestContext";
import type { IPermissionEngine } from "../../Engines/PermissionEngine/IPermissionEngine";
import type { PermissionAction } from "../../Engines/PermissionEngine/PermissionAction";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import { EvaluatePermissionRequest } from "../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import { PermissionUnavailableResponse } from "../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import { CommentForbiddenResponse } from "./Responses/CommentForbiddenResponse";
import { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";

// Every comment handler asks the same question first. Answers `undefined` when the actor
// may proceed, otherwise the response the handler returns as it is. The same shape as
// PostManager's permit: a Manager may not import another Manager's folder, and two
// copies are under the rule of three.
export async function permit(
  permissions: IPermissionEngine,
  actor: Actor,
  action: PermissionAction,
  subject: PermissionSubject,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<CommentForbiddenResponse | CommentUnavailableResponse | undefined> {
  const { correlationId } = context;
  const verdict = await permissions.evaluate(
    new EvaluatePermissionRequest(actor, action, subject, context),
  );
  if (verdict instanceof PermissionGrantedResponse) {
    return undefined;
  }
  if (verdict instanceof PermissionDeniedResponse) {
    return new CommentForbiddenResponse(correlationId, verdict.reason);
  }
  if (verdict instanceof PermissionUnavailableResponse) {
    return new CommentUnavailableResponse(correlationId, verdict.reason);
  }
  return new CommentUnavailableResponse(
    correlationId,
    `unexpected ${verdict.constructor.name} from evaluate`,
  );
}
