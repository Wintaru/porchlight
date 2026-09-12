import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PermissionAction } from "../PermissionAction";
import type { PermissionSubject } from "../PermissionSubject";

// "May this actor do this action to this subject?"
export class EvaluatePermissionRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly action: PermissionAction,
    readonly subject: PermissionSubject,
    context?: RequestContext,
  ) {
    super(context);
  }
}
