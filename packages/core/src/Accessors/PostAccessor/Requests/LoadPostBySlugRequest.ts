import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Slugs are unique across the site (D11), so one slug names one post.
export class LoadPostBySlugRequest extends RequestBase {
  constructor(
    readonly slug: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
