import type { IHandler } from "../../../Common/IHandler";
import type { SiteConfigCache } from "../SiteConfigCache";
import type { RefreshSiteConfigRequest } from "../Requests/RefreshSiteConfigRequest";
import { SiteConfigRefreshedResponse } from "../Responses/SiteConfigRefreshedResponse";

export class SupabaseRefreshSiteConfigHandler implements IHandler<
  RefreshSiteConfigRequest,
  SiteConfigRefreshedResponse
> {
  constructor(private readonly config: SiteConfigCache) {}

  handle(request: RefreshSiteConfigRequest): Promise<SiteConfigRefreshedResponse> {
    this.config.forget();
    return Promise.resolve(new SiteConfigRefreshedResponse(request.correlationId));
  }
}
