import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { EvaluateQuotaHandler } from "../Engines/QuotaEngine/Handlers/EvaluateQuotaHandler";
import type { IQuotaEngine } from "../Engines/QuotaEngine/IQuotaEngine";
import { QuotaEngine } from "../Engines/QuotaEngine/QuotaEngine";
import { EvaluateQuotaRequest } from "../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";

// Pure rules, no environment to read.
export function createQuotaEngine(): IQuotaEngine {
  return new QuotaEngine(
    new HandlerResolverBuilder()
      .register(EvaluateQuotaRequest, new EvaluateQuotaHandler())
      .build(),
  );
}
