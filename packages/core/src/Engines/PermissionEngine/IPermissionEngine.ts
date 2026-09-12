import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The rules of who may do what (SPEC.md §4, §5). `evaluate` answers a yes-or-no question
// about an actor, an action or a handle; `transform` reshapes input by the same rules,
// such as deriving a handle from an email. The only I/O behind either is a read of the
// D20 site policy through the SiteConfigAccessor, and only for the rules that need it.
export interface IPermissionEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
  transform(request: RequestBase): Promise<ResponseBase>;
}
