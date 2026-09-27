import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The editor's upload, made for the post it is editing (#80): the upload joins that
// post, so the post's upload list shows it before it is in the body.
export class AttachMediaToPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
