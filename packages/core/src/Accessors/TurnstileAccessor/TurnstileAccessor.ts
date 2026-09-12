import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { ITurnstileAccessor } from "./ITurnstileAccessor";

// Thin shell: one resolver, no logic.
export class TurnstileAccessor implements ITurnstileAccessor {
  constructor(private readonly loadResolver: HandlerResolver) {}

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }
}
