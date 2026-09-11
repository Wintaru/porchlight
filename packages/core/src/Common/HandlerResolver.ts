import type { RequestBase } from "./RequestBase";
import type { RequestDispatch } from "./RequestDispatch";
import type { ResponseBase } from "./ResponseBase";
import { UnhandledRequestResponse } from "./UnhandledRequestResponse";

// Maps a request's class to its handler at runtime. One resolver per intent method on a
// layer impl (`execute` and `query` on a Manager, `store` and `load` on an Accessor).
// Built once by HandlerResolverBuilder at the composition root, then immutable.
export class HandlerResolver {
  constructor(private readonly dispatches: ReadonlyMap<object, RequestDispatch>) {}

  async resolve(request: RequestBase): Promise<ResponseBase> {
    const dispatch = this.dispatches.get(request.constructor);
    const pending = dispatch?.(request);
    if (pending === undefined) {
      return new UnhandledRequestResponse(
        request.correlationId,
        request.constructor.name,
      );
    }
    return pending;
  }
}
