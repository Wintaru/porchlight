import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostSelector } from "../PostSelector";

// One post, by id or by slug. A published post is anyone's to read; any other status
// only its author's or an admin's, and answers NoSuchPost to everyone else. `edit` is
// the editor's load (#66): only someone who may edit the post gets it, published or not.
export class GetPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly selector: PostSelector,
    readonly purpose: "read" | "edit" = "read",
    context?: RequestContext,
  ) {
    super(context);
  }
}
