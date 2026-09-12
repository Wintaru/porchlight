import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `comments` table. `store` writes (a new comment, an edited
// body, a tombstone), `load` reads, `remove` hard-deletes. The Supabase handlers and the
// fake handlers share the Requests/ and Responses/ next to this file (D19).
export interface ICommentAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
