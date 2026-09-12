import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IQuotaAccessor } from "./IQuotaAccessor";

// Thin shell: one resolver per intent method, no logic.
export class QuotaAccessor implements IQuotaAccessor {
  constructor(
    private readonly loadResolver: HandlerResolver,
    private readonly storeResolver: HandlerResolver,
  ) {}

  load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request);
  }

  store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request);
  }
}
