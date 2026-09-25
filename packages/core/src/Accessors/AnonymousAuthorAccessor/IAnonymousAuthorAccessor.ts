import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `anonymous_authors` (D7). `store` creates a first-write row,
// claims one, and records the address a returning author wrote from (#37); `load` reads
// by secret hash, reads the status page's items, and reads that address hash.
export interface IAnonymousAuthorAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
