import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IRateLimitAccessor } from "./IRateLimitAccessor";

// Thin shell: one resolver, no logic.
export class RateLimitAccessor implements IRateLimitAccessor {
  constructor(private readonly storeResolver: HandlerResolver) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }
}
