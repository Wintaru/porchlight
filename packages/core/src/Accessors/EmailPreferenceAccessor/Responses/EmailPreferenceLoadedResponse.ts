import type { EmailPreference } from "../../../Common/EmailPreference";
import { ResponseBase } from "../../../Common/ResponseBase";

export class EmailPreferenceLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly preference: EmailPreference,
  ) {
    super(correlationId);
  }
}
