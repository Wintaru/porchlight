import type { EmailPreference } from "../../../Common/EmailPreference";
import { ResponseBase } from "../../../Common/ResponseBase";

// `enabled` is false when the site has no mail vendor: the page then says so instead of
// offering settings that would do nothing. `mayQueue` is true for an admin or moderator.
export class EmailSettingsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly enabled: boolean,
    readonly preference: EmailPreference,
    readonly mayQueue: boolean,
  ) {
    super(correlationId);
  }
}
