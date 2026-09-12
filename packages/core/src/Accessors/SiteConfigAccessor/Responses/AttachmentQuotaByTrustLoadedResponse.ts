import type { AttachmentQuotaByTrust } from "../../../Common/AttachmentQuota";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AttachmentQuotaByTrustLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly quotaByTrust: AttachmentQuotaByTrust,
  ) {
    super(correlationId);
  }
}
