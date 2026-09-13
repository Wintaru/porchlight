import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// A member's own notification inbox (SPEC.md §8). `execute` marks read, `query` lists.
// Every other Manager records a notification directly through INotificationAccessor —
// writing one is a side effect of an action that Manager already owns, never a
// Manager-to-Manager call.
export interface INotificationManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
