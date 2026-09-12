import type { IHandler } from "../../../Common/IHandler";
import { renderMarkdown } from "../../../Utilities/markdown/renderMarkdown";
import { HTML_ALLOWLIST } from "../HtmlAllowlist";
import type { RenderMarkdownRequest } from "../Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../Responses/MarkdownRenderedResponse";

// The one render path for every body on the site. The Utility renders; the allowlist
// next to this handler is the policy.
export class RenderMarkdownHandler implements IHandler<
  RenderMarkdownRequest,
  MarkdownRenderedResponse
> {
  async handle(request: RenderMarkdownRequest): Promise<MarkdownRenderedResponse> {
    const html = await renderMarkdown(request.markdown, HTML_ALLOWLIST);
    return new MarkdownRenderedResponse(request.correlationId, html);
  }
}
