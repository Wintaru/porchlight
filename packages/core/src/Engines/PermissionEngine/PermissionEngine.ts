import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IPermissionEngine } from "./IPermissionEngine";

// Thin shell: one resolver per intent method. The rules live in Handlers/.
export class PermissionEngine implements IPermissionEngine {
  constructor(
    private readonly evaluateResolver: HandlerResolver,
    private readonly transformResolver: HandlerResolver,
  ) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }

  transform(request: RequestBase): Promise<ResponseBase> {
    return this.transformResolver.resolve(request);
  }
}
