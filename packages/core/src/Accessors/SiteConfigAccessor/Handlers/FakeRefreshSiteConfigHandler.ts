import type { IHandler } from "../../../Common/IHandler";
import type { RefreshSiteConfigRequest } from "../Requests/RefreshSiteConfigRequest";
import { SiteConfigRefreshedResponse } from "../Responses/SiteConfigRefreshedResponse";

// The fake keeps no copy: every read is already fresh.
export class FakeRefreshSiteConfigHandler implements IHandler<
  RefreshSiteConfigRequest,
  SiteConfigRefreshedResponse
> {
  handle(request: RefreshSiteConfigRequest): Promise<SiteConfigRefreshedResponse> {
    return Promise.resolve(new SiteConfigRefreshedResponse(request.correlationId));
  }
}
