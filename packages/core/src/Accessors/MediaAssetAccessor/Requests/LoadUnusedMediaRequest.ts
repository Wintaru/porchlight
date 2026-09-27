import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Of these uploads of one member, the ones no post uses any more (#80). The database
// decides "uses" (`unused_media`). `postId`, the post just saved, lets it set aside the
// ones that post still uses before it looks at every post.
export class LoadUnusedMediaRequest extends RequestBase {
  constructor(
    readonly mediaIds: readonly string[],
    readonly ownerId: string,
    readonly postId: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
