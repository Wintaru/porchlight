import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Accounts and profiles (SPEC.md §4). `execute` changes state (first sign-in, profile
// edits), `query` reads. The Client narrows the response with `instanceof` against the
// classes in Responses/.
export interface IAccountManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
