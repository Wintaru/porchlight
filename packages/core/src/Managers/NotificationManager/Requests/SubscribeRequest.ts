import type { DigestSchedule } from "../../../Common/DigestSchedule";
import type { EmailSite } from "../../../Common/EmailSite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { RequestOrigin } from "../../../Common/RequestOrigin";

// A reader asks for new posts by email (#22, D20): from the whole site (`authorId`
// null) or one author. No actor: a reader needs no account. `email` is as typed.
export class SubscribeRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly authorId: string | null,
    readonly digest: DigestSchedule,
    readonly turnstileToken: string | undefined,
    readonly origin: RequestOrigin,
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
