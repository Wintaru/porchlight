import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `rate_limits` (D15): one fixed-window counter per subject and
// action. `store` is the only method: a counter is bumped, never read on its own.
export interface IRateLimitAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
}
