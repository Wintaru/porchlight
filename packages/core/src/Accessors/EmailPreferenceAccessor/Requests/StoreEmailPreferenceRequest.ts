import type { EmailPreference } from "../../../Common/EmailPreference";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Saves a member's settings. Turning a kind of email on starts its window now.
export class StoreEmailPreferenceRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly preference: EmailPreference,
    context?: RequestContext,
  ) {
    super(context);
  }
}
