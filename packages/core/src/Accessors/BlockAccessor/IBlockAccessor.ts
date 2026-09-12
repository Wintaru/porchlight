import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `blocks` (D15). `load` is the only method: creating a block is
// an admin action that lands with the moderation queue (#11); #8 only needs to read
// the list at submit time.
export interface IBlockAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
}
