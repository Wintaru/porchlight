import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IContentRenderEngine } from "./IContentRenderEngine";

// Thin shell: one resolver for the one intent method. The rules live in Handlers/.
export class ContentRenderEngine implements IContentRenderEngine {
  constructor(private readonly transformResolver: HandlerResolver) {}

  transform(request: RequestBase): Promise<ResponseBase> {
    return this.transformResolver.resolve(request);
  }
}
