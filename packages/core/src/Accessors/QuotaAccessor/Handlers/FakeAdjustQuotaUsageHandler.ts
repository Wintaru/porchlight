import type { IHandler } from "../../../Common/IHandler";
import type { FakeQuotaState } from "../FakeQuotaState";
import type { AdjustQuotaUsageRequest } from "../Requests/AdjustQuotaUsageRequest";
import { QuotaAccessFailedResponse } from "../Responses/QuotaAccessFailedResponse";
import { QuotaUsageStoredResponse } from "../Responses/QuotaUsageStoredResponse";

type Result = QuotaUsageStoredResponse | QuotaAccessFailedResponse;

export class FakeAdjustQuotaUsageHandler implements IHandler<
  AdjustQuotaUsageRequest,
  Result
> {
  constructor(private readonly state: FakeQuotaState) {}

  handle(request: AdjustQuotaUsageRequest): Promise<Result> {
    const { profileId, deltaBytes, deltaFiles, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new QuotaAccessFailedResponse(correlationId, "QUOTA_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.usage.get(profileId) ?? { bytesUsed: 0, filesCount: 0 };
    const next = {
      bytesUsed: Math.max(0, current.bytesUsed + deltaBytes),
      filesCount: Math.max(0, current.filesCount + deltaFiles),
    };
    this.state.usage.set(profileId, next);
    return Promise.resolve(
      new QuotaUsageStoredResponse(correlationId, next.bytesUsed, next.filesCount),
    );
  }
}
