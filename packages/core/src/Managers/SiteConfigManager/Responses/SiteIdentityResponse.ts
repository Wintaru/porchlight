import type { SiteIdentity } from "../../../Common/SiteIdentity";
import { ResponseBase } from "../../../Common/ResponseBase";

export class SiteIdentityResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly identity: SiteIdentity,
  ) {
    super(correlationId);
  }
}
