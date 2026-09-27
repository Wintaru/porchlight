import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IEmailAccessor } from "./IEmailAccessor";

// Thin shell: one resolver per intent method, no logic.
export class EmailAccessor implements IEmailAccessor {
  constructor(private readonly storeResolver: HandlerResolver) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }
}
