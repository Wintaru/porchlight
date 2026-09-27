import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `member_blocks` (#23). `store` sets a member's level for one
// other member, `remove` takes it back, `load` reads a member's own list (the export)
// or the rows some members hold about one target (the comment check). Lists on the
// site read the viewer's own rows under RLS in the Client's read-model, not through here.
export interface IMemberBlockAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
