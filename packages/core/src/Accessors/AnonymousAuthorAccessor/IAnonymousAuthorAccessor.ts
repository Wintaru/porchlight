import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `anonymous_authors` (D7). `store` creates a first-write row and
// claims one; `load` reads by secret hash and reads the status page's items.
export interface IAnonymousAuthorAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
