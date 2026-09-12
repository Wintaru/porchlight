import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostSelector } from "../PostSelector";

// One post, by id or by slug. A published post is anyone's to read; any other status
// only its author's or an admin's, and answers NoSuchPost to everyone else.
export class GetPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly selector: PostSelector,
    context?: RequestContext,
  ) {
    super(context);
  }
}
