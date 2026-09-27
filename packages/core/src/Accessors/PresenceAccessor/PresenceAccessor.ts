import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IPresenceAccessor } from "./IPresenceAccessor";

// Thin shell: one resolver, no logic.
export class PresenceAccessor implements IPresenceAccessor {
  constructor(private readonly storeResolver: HandlerResolver) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }
}
