import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IGreetingAccessor } from "./IGreetingAccessor";

// Thin shell: one resolver per intent method, no logic. The fake handlers in Handlers/
// carry the behavior, and the composition root wires them in. A real accessor has the
// same shape with its own handlers over @porchlight/db.
export class FakeGreetingAccessor implements IGreetingAccessor {
  constructor(
    private readonly storeResolver: HandlerResolver,
    private readonly loadResolver: HandlerResolver,
  ) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }
}
