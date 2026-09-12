import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The rules of who may do what (SPEC.md §4, §5). `evaluate` answers a yes-or-no question
// about an actor, an action or a handle; `transform` reshapes input by the same rules,
// such as deriving a handle from an email. Pure: no I/O behind either method.
export interface IPermissionEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
  transform(request: RequestBase): Promise<ResponseBase>;
}
