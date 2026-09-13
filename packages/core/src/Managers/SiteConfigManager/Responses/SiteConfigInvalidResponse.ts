import { ResponseBase } from "../../../Common/ResponseBase";

// One field of a save request failed validation. `field` is a `SiteConfigSnapshot` key
// (for example `"moderationThresholds"`), never a raw `site_config` column name.
export class SiteConfigInvalidResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly field: string,
    readonly message: string,
  ) {
    super(correlationId);
  }
}
