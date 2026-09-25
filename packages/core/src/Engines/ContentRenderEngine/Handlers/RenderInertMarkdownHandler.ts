import type { IHandler } from "../../../Common/IHandler";
import { renderMarkdown } from "../../../Utilities/markdown/renderMarkdown";
import { HTML_ALLOWLIST } from "../HtmlAllowlist";
import type { RenderInertMarkdownRequest } from "../Requests/RenderInertMarkdownRequest";
import { MarkdownRenderedResponse } from "../Responses/MarkdownRenderedResponse";

// The same allowlist as every other body, with links and images made text first.
export class RenderInertMarkdownHandler implements IHandler<
  RenderInertMarkdownRequest,
  MarkdownRenderedResponse
> {
  async handle(request: RenderInertMarkdownRequest): Promise<MarkdownRenderedResponse> {
    const html = await renderMarkdown(request.markdown, HTML_ALLOWLIST, { inert: true });
    return new MarkdownRenderedResponse(request.correlationId, html);
  }
}
