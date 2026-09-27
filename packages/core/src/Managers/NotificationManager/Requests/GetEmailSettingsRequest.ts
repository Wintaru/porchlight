import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The caller's own email settings for the settings page (#22).
export class GetEmailSettingsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
