import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IBlockAccessor } from "./IBlockAccessor";

// Thin shell: one resolver per intent method, no logic.
export class BlockAccessor implements IBlockAccessor {
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
