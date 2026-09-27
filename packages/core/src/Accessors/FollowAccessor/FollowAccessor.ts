import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IFollowAccessor } from "./IFollowAccessor";

// Thin shell: one resolver per intent method, no logic.
export class FollowAccessor implements IFollowAccessor {
  constructor(
    private readonly storeResolver: HandlerResolver,
    private readonly loadResolver: HandlerResolver,
    private readonly removeResolver: HandlerResolver,
  ) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }

  remove(request: RequestBase): Promise<ResponseBase> {
    return this.removeResolver.resolve(request);
  }
}
