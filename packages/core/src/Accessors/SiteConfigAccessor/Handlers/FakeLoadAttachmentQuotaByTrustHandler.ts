import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAttachmentQuotaByTrustRequest } from "../Requests/LoadAttachmentQuotaByTrustRequest";
import { AttachmentQuotaByTrustLoadedResponse } from "../Responses/AttachmentQuotaByTrustLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAttachmentQuotaByTrustHandler implements IHandler<
  LoadAttachmentQuotaByTrustRequest,
  AttachmentQuotaByTrustLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAttachmentQuotaByTrustRequest,
  ): Promise<AttachmentQuotaByTrustLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AttachmentQuotaByTrustLoadedResponse(
            request.correlationId,
            this.state.attachmentQuotaByTrust,
          ),
    );
  }
}
