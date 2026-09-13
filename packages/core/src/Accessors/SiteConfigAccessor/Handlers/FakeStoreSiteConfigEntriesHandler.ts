import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { StoreSiteConfigEntriesRequest } from "../Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import { SiteConfigStoredResponse } from "../Responses/SiteConfigStoredResponse";

export class FakeStoreSiteConfigEntriesHandler implements IHandler<
  StoreSiteConfigEntriesRequest,
  SiteConfigStoredResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: StoreSiteConfigEntriesRequest,
  ): Promise<SiteConfigStoredResponse | SiteConfigAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SiteConfigAccessFailedResponse(
          request.correlationId,
          "SITE_CONFIG_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.stored.push(...request.entries);
    return Promise.resolve(new SiteConfigStoredResponse(request.correlationId));
  }
}
