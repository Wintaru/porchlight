import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The editor's upload list (#52): the member's own uploads for one post (#80), so a file
// uploaded before a reload can still go into it. `postId` null lists the uploads in no
// post, so a member can still find and remove them.
export class ListMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
