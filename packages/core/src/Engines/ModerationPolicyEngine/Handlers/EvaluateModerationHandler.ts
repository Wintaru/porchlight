import type { IHandler } from "../../../Common/IHandler";
import type { EvaluateModerationRequest } from "../Requests/EvaluateModerationRequest";
import { ContentClearResponse } from "../Responses/ContentClearResponse";
import { ContentFlaggedResponse } from "../Responses/ContentFlaggedResponse";
import { ContentLockedResponse } from "../Responses/ContentLockedResponse";

type Result = ContentClearResponse | ContentFlaggedResponse | ContentLockedResponse;

// The fixed policy (SPEC.md §7, WAYFINDER D17): a hash match always locks; a
// minors-related classifier hit always locks regardless of score; a severity score at
// or above the lock threshold locks; at or above the flag threshold it holds for
// review; anything else is clear. Pure and total — no branch reaches an accessor.
export class EvaluateModerationHandler implements IHandler<
  EvaluateModerationRequest,
  Result
> {
  handle(request: EvaluateModerationRequest): Promise<Result> {
    const { correlationId, hashMatched, imageClassification, thresholds } = request;

    if (hashMatched) {
      return this.locked(correlationId, "hash-match");
    }
    if (imageClassification === undefined) {
      return this.clear(correlationId);
    }
    if (imageClassification.minorsSignal) {
      return this.locked(correlationId, "minors-signal");
    }
    if (imageClassification.severityScore >= thresholds.lockAt) {
      return this.locked(correlationId, "severity");
    }
    if (imageClassification.severityScore >= thresholds.flagAt) {
      return this.flagged(correlationId);
    }
    return this.clear(correlationId);
  }

  private clear(correlationId: string): Promise<Result> {
    return Promise.resolve(new ContentClearResponse(correlationId));
  }

  private flagged(correlationId: string): Promise<Result> {
    return Promise.resolve(new ContentFlaggedResponse(correlationId));
  }

  private locked(
    correlationId: string,
    reason: "hash-match" | "minors-signal" | "severity",
  ): Promise<Result> {
    return Promise.resolve(new ContentLockedResponse(correlationId, reason));
  }
}
