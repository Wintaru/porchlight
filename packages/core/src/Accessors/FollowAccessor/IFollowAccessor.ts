import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `follows` (#24). `store` adds a follow, `remove` takes it back,
// `load` reads a member's own follows (the export) or the followers of an author and
// some tags (the fan-out when a post goes out). The Following feed reads the viewer's
// own rows under RLS in the Client's read-model, not through here.
export interface IFollowAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
