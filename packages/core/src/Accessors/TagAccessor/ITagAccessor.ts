import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for a tag's own page text (#24): its admin-written description. The
// tags a post carries are the PostAccessor's; lists of tags are the read-model's.
export interface ITagAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
  store(request: RequestBase): Promise<ResponseBase>;
}
