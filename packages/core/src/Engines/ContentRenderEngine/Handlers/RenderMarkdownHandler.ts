import type { IHandler } from "../../../Common/IHandler";
import { renderMarkdown } from "../../../Utilities/markdown/renderMarkdown";
import { HTML_ALLOWLIST } from "../HtmlAllowlist";
import type { ContentRenderOptions } from "../RenderOptions";
import type { RenderMarkdownRequest } from "../Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../Responses/MarkdownRenderedResponse";
import { videoEmbedFor } from "../VideoEmbeds";

// The one render path for every body on the site. The Utility renders; the allowlist
// and the video links next to this handler are the policy.
export class RenderMarkdownHandler implements IHandler<
  RenderMarkdownRequest,
  MarkdownRenderedResponse
> {
  constructor(
    private readonly options: ContentRenderOptions = { uploadedVideoPrefix: null },
  ) {}

  async handle(request: RenderMarkdownRequest): Promise<MarkdownRenderedResponse> {
    const html = await renderMarkdown(request.markdown, HTML_ALLOWLIST, {
      inert: false,
      loneLink: (href) => videoEmbedFor(href, this.options.uploadedVideoPrefix),
    });
    return new MarkdownRenderedResponse(request.correlationId, html);
  }
}
