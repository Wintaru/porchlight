import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IPostManager } from "./IPostManager";

// Thin shell: one resolver per intent method. Everything happens in Handlers/.
export class PostManager implements IPostManager {
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
