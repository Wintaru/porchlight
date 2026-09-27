import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IEmailComposeEngine } from "./IEmailComposeEngine";

// Thin shell: one resolver per intent method, no logic.
export class EmailComposeEngine implements IEmailComposeEngine {
  constructor(private readonly transformResolver: HandlerResolver) {}

  transform(request: RequestBase): Promise<ResponseBase> {
    return this.transformResolver.resolve(request);
  }
}
