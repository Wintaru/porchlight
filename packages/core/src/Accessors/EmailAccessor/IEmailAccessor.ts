import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for outgoing email (SPEC.md §8, D14, #22). `store` hands messages to
// the mail vendor. Nothing is read back: delivery and bounces live in the vendor's
// dashboard.
export interface IEmailAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
}
