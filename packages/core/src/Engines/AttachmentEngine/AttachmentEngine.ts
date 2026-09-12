import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IAttachmentEngine } from "./IAttachmentEngine";

// Thin shell: one resolver for the one intent method. The rule lives in Handlers/.
export class AttachmentEngine implements IAttachmentEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }
}
