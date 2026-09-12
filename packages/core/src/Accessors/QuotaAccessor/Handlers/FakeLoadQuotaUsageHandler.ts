import type { IHandler } from "../../../Common/IHandler";
import type { FakeQuotaState } from "../FakeQuotaState";
import type { LoadQuotaUsageRequest } from "../Requests/LoadQuotaUsageRequest";
import { QuotaAccessFailedResponse } from "../Responses/QuotaAccessFailedResponse";
import { QuotaUsageLoadedResponse } from "../Responses/QuotaUsageLoadedResponse";

export class FakeLoadQuotaUsageHandler implements IHandler<
  LoadQuotaUsageRequest,
  QuotaUsageLoadedResponse | QuotaAccessFailedResponse
> {
  constructor(private readonly state: FakeQuotaState) {}

  handle(
    request: LoadQuotaUsageRequest,
  ): Promise<QuotaUsageLoadedResponse | QuotaAccessFailedResponse> {
    const { profileId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new QuotaAccessFailedResponse(correlationId, "QUOTA_FAKE_RESULT=fail"),
      );
    }
    const usage = this.state.usage.get(profileId);
    return Promise.resolve(
      new QuotaUsageLoadedResponse(
        correlationId,
        usage?.bytesUsed ?? 0,
        usage?.filesCount ?? 0,
      ),
    );
  }
}
