import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `notifications` table (SPEC.md §8). `store` records a
// notification or marks one (or all) read; `load` lists them for the bell.
export interface INotificationAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
