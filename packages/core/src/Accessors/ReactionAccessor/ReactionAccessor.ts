import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IReactionAccessor } from "./IReactionAccessor";

// Thin shell: one resolver per intent method, no logic.
export class ReactionAccessor implements IReactionAccessor {
  constructor(
    private readonly storeResolver: HandlerResolver,
    private readonly removeResolver: HandlerResolver,
  ) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }

  remove(request: RequestBase): Promise<ResponseBase> {
    return this.removeResolver.resolve(request);
  }
}
