import type { RequestBase } from "./RequestBase";
import type { ResponseBase } from "./ResponseBase";

// One handler per request class, one file each, all logic inside. A handler is typed to
// its own request so its body never narrows. The resolver does the narrowing once.
//
// `handle` is a property, not a method, on purpose. TypeScript checks method parameters
// bivariantly even under strictFunctionTypes, which would let `register(Base, subHandler)`
// compile and then crash at runtime. A function-typed property is checked contravariantly,
// so a handler for a subclass of the registered request is a compile error. A class method
// still satisfies this signature.
export interface IHandler<
  TRequest extends RequestBase,
  TResponse extends ResponseBase = ResponseBase,
> {
  readonly handle: (request: TRequest) => Promise<TResponse>;
}
