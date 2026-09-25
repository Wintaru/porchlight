import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A body nobody has approved yet, rendered for a moderator to read (SPEC.md §4, #34):
// the same sanitized HTML as RenderMarkdownRequest, with every link and image turned
// into plain text. Never cached in `body_html`: the stored render stays the one the
// public sees once the item is approved.
export class RenderInertMarkdownRequest extends RequestBase {
  constructor(
    readonly markdown: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
