import type { Actor } from "../../../Common/Actor";
import type { EmailPreference } from "../../../Common/EmailPreference";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Saves the caller's own email settings (#22). Only an admin or moderator may turn on
// the moderation-queue email.
export class SetEmailSettingsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly preference: EmailPreference,
    context?: RequestContext,
  ) {
    super(context);
  }
}
