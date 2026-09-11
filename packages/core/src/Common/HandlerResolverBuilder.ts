import { HandlerResolver } from "./HandlerResolver";
import type { IHandler } from "./IHandler";
import type { RequestBase } from "./RequestBase";
import type { RequestConstructor } from "./RequestConstructor";
import type { RequestDispatch } from "./RequestDispatch";
import type { ResponseBase } from "./ResponseBase";

// Registers one handler per request class and builds the resolver. Only the composition
// root calls this, so every handler in the system is registered in one place.
export class HandlerResolverBuilder {
  private readonly dispatches = new Map<object, RequestDispatch>();

  register<TRequest extends RequestBase, TResponse extends ResponseBase>(
    requestType: RequestConstructor<TRequest>,
    handler: IHandler<TRequest, TResponse>,
  ): this {
    if (this.dispatches.has(requestType)) {
      throw new Error(`${requestType.name} already has a handler on this resolver`);
    }
    this.dispatches.set(requestType, (request) =>
      request instanceof requestType ? handler.handle(request) : undefined,
    );
    return this;
  }

  build(): HandlerResolver {
    return new HandlerResolver(new Map(this.dispatches));
  }
}
