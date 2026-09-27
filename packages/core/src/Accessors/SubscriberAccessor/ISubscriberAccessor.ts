import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `subscribers` (#22, D20). `store` asks, confirms, claims and puts
// back; `remove` ends a subscription from its unsubscribe link.
export interface ISubscriberAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
