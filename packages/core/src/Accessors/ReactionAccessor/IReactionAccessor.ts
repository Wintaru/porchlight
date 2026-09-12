import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `reactions` table (D9). `store` adds one, `remove` takes it
// back. Counts are read by the Client's read-model under RLS, never through here: the
// item's counts are public, and this boundary exists only for the write path.
export interface IReactionAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
