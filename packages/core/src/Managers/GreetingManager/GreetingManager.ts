import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IGreetingManager } from "./IGreetingManager";

// The example Manager. It is the template every real Manager follows: a thin shell that
// holds one resolver per intent method and delegates everything to Handlers/.
export class GreetingManager implements IGreetingManager {
  constructor(
    private readonly executeResolver: HandlerResolver,
    private readonly queryResolver: HandlerResolver,
  ) {}

  execute(request: RequestBase): Promise<ResponseBase> {
    return this.executeResolver.resolve(request);
  }

  query(request: RequestBase): Promise<ResponseBase> {
    return this.queryResolver.resolve(request);
  }
}
