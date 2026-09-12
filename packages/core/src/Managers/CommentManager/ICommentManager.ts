import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Comments and reactions (SPEC.md §5). `execute` changes state (create, edit, delete a
// comment; toggle a reaction on a post or a comment), `query` reads. The Client narrows
// the response with `instanceof` against the classes in Responses/.
export interface ICommentManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
