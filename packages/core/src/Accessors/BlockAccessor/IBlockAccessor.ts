import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `blocks` (D15). `store` creates a block, a moderator action
// (#11); `load` reads the list at submit time (#8).
export interface IBlockAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
