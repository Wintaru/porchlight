import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `posts`, `tags` and `post_tags` tables. `store` writes,
// `load` reads, `remove` deletes. The Supabase handlers and the fake handlers share the
// Requests/ and Responses/ next to this file, so a Manager cannot tell them apart (D19).
export interface IPostAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
