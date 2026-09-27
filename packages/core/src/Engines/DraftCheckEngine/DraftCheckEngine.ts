import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IDraftCheckEngine } from "./IDraftCheckEngine";

// Thin shell: one resolver per intent method, no logic.
export class DraftCheckEngine implements IDraftCheckEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }
}
