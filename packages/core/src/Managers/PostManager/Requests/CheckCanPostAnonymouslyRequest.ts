import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "May an anonymous write start here?" (D20). The write page asks this for a visitor,
// the same way CheckCanPostRequest asks for a member, before it shows either form.
export class CheckCanPostAnonymouslyRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
