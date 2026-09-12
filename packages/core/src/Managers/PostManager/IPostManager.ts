import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Posts (SPEC.md §5). `execute` changes state (draft, publish, unpublish, delete),
// `query` reads. The Client narrows the response with `instanceof` against the classes
// in Responses/.
export interface IPostManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
