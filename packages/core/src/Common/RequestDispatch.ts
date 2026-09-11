import type { RequestBase } from "./RequestBase";
import type { ResponseBase } from "./ResponseBase";

// What the builder stores per request class: a closure that owns the typed handler and
// re-checks the class with `instanceof` before calling it. `undefined` means the request
// was not an instance of the class this closure was registered for, which the resolver
// reports as unhandled. The check is what makes the dispatch sound without a cast.
export type RequestDispatch = (request: RequestBase) => Promise<ResponseBase> | undefined;
