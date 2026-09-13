import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IImageClassifierAccessor } from "./IImageClassifierAccessor";

// Thin shell: one resolver, no logic.
export class ImageClassifierAccessor implements IImageClassifierAccessor {
  constructor(private readonly loadResolver: HandlerResolver) {}

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }
}
