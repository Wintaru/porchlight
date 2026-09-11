import type { RequestBase } from "./RequestBase";

// The class of a request, used as the dispatch key. `never[]` for the parameters makes
// every concrete request constructor assignable, whatever its own signature is.
export type RequestConstructor<TRequest extends RequestBase> = new (
  ...args: never[]
) => TRequest;
