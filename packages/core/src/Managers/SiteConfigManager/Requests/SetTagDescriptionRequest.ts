import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// An admin says what a tag is for (#24). Blank text clears it.
export class SetTagDescriptionRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly slug: string,
    readonly descriptionMd: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
