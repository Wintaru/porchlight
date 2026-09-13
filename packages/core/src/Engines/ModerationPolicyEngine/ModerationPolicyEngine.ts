import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IModerationPolicyEngine } from "./IModerationPolicyEngine";

// Thin shell: one resolver, no logic.
export class ModerationPolicyEngine implements IModerationPolicyEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }
}
