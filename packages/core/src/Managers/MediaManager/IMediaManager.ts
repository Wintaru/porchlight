import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Uploads (SPEC.md §6). `execute` requests a signed upload URL, finalizes what a
// browser put there, or deletes an owned upload; `query` reads one back. The Client
// narrows the response with `instanceof` against the classes in Responses/.
export interface IMediaManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
