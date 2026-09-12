import type { RequestContext } from "../../Common/RequestContext";
import type { IContentRenderEngine } from "../../Engines/ContentRenderEngine/IContentRenderEngine";
import { RenderMarkdownRequest } from "../../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../../Engines/ContentRenderEngine/Responses/MarkdownRenderedResponse";
import type { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";
import { unavailable } from "./unavailable";

// Markdown to the HTML that is cached beside it (D3), through the one render path a post
// body takes, so a comment can carry nothing a post cannot.
export async function renderBody(
  content: IContentRenderEngine,
  bodyMd: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<string | CommentUnavailableResponse> {
  const rendered = await content.transform(new RenderMarkdownRequest(bodyMd, context));
  if (rendered instanceof MarkdownRenderedResponse) {
    return rendered.html;
  }
  return unavailable(context.correlationId, rendered, "transform");
}
