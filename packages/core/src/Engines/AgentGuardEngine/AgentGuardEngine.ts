import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IAgentGuardEngine } from "./IAgentGuardEngine";

// Thin shell: one resolver, no logic.
export class AgentGuardEngine implements IAgentGuardEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  evaluate(request: RequestBase): Promise<ResponseBase> {
    return this.evaluateResolver.resolve(request);
  }
}
