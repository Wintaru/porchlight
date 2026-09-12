import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IBlockAccessor } from "./IBlockAccessor";

// Thin shell: one resolver, no logic.
export class BlockAccessor implements IBlockAccessor {
  constructor(private readonly loadResolver: HandlerResolver) {}

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }
}
