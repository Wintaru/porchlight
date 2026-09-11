import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the example domain. `store` persists, `load` reads. A real
// implementation would sit on @porchlight/db; the Fake keeps state in memory. Both share
// the Requests/ and Responses/ next to this file, so a Manager handler cannot tell them
// apart, which is the point of the fake-provider pattern (D19).
export interface IGreetingAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
