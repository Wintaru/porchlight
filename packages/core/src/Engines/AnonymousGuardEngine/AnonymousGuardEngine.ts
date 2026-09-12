import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IAnonymousGuardEngine } from "./IAnonymousGuardEngine";

// Thin shell: one resolver for the one intent method. The sequence lives in Handlers/.
export class AnonymousGuardEngine implements IAnonymousGuardEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }
}
