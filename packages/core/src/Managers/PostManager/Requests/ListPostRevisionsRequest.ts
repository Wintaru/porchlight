import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A post's history (#23): the post as it is now and its earlier versions, newest first.
// Only someone who may edit the post gets it; everyone else gets NoSuchPost, the same
// answer as the editor's load (#66).
export class ListPostRevisionsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
