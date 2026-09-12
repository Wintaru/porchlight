import type { IHandler } from "../../../Common/IHandler";
import type { QuotaDenialReason } from "../QuotaDenialReason";
import type { EvaluateQuotaRequest } from "../Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../Responses/QuotaExceededResponse";

type Result = QuotaAllowedResponse | QuotaExceededResponse;

// Pure: every fact this rule needs — which cap applies, how much is already used, how
// big the incoming file is — arrives on the request. A member checks the per-file cap
// and the running account total for their trust level; an anonymous author checks the
// D15 fixed per-file cap and the fixed file count, never a byte total (SPEC.md §4, §6).
export class EvaluateQuotaHandler implements IHandler<EvaluateQuotaRequest, Result> {
  handle(request: EvaluateQuotaRequest): Promise<Result> {
    const { correlationId, check, incomingBytes, usage } = request;
    if (check.kind === "anonymous") {
      const { files, bytesPerFile } = check.cap;
      if (incomingBytes > bytesPerFile) {
        return this.exceeded(correlationId, "file-too-large", bytesPerFile);
      }
      if (usage.filesCount >= files) {
        return this.exceeded(correlationId, "file-count-cap", files);
      }
      return this.allowed(correlationId);
    }
    const quota = check.quotaByTrust[check.trustLevel];
    if (incomingBytes > quota.maxFileBytes) {
      return this.exceeded(correlationId, "file-too-large", quota.maxFileBytes);
    }
    if (usage.bytesUsed + incomingBytes > quota.maxAccountBytes) {
      return this.exceeded(correlationId, "account-cap", quota.maxAccountBytes);
    }
    return this.allowed(correlationId);
  }

  private allowed(correlationId: string): Promise<Result> {
    return Promise.resolve(new QuotaAllowedResponse(correlationId));
  }

  private exceeded(
    correlationId: string,
    reason: QuotaDenialReason,
    limit: number,
  ): Promise<Result> {
    return Promise.resolve(new QuotaExceededResponse(correlationId, reason, limit));
  }
}
