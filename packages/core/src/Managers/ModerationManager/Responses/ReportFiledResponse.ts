import type { Report } from "../../../Common/Report";
import { ResponseBase } from "../../../Common/ResponseBase";

// `anonymousSecret` is the cookie value a visitor's browser must keep, as with an
// anonymous comment: the guard knows the same browser next time. Null for a member.
export class ReportFiledResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly report: Report,
    readonly anonymousSecret: string | null,
  ) {
    super(correlationId);
  }
}
