import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IEvidenceAccessor } from "./IEvidenceAccessor";

// Thin shell: one resolver for the one intent method, no logic.
export class EvidenceAccessor implements IEvidenceAccessor {
  constructor(private readonly storeResolver: HandlerResolver) {}

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }
}
