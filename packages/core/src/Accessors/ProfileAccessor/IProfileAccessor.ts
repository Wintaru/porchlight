import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `profiles` table. `store` writes, `load` reads. The Supabase
// handlers and the fake handlers share the Requests/ and Responses/ next to this file,
// so a Manager handler cannot tell them apart (D19).
export interface IProfileAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
