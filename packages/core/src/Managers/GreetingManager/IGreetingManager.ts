import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// What the Client sees. `execute` changes state, `query` only reads (SPEC.md §3). The
// Client narrows the response with `instanceof` against the classes in Responses/.
export interface IGreetingManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
