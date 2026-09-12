import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAttachmentAllowlistRequest } from "../Requests/LoadAttachmentAllowlistRequest";
import { AttachmentAllowlistLoadedResponse } from "../Responses/AttachmentAllowlistLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAttachmentAllowlistHandler implements IHandler<
  LoadAttachmentAllowlistRequest,
  AttachmentAllowlistLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAttachmentAllowlistRequest,
  ): Promise<AttachmentAllowlistLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AttachmentAllowlistLoadedResponse(
            request.correlationId,
            this.state.attachmentAllowlist,
          ),
    );
  }
}
