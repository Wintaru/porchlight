import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Markdown to the sanitized HTML that is cached in `body_html` (D3).
export class RenderMarkdownRequest extends RequestBase {
  constructor(
    readonly markdown: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
