import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { PreviewPostRequest } from "../Requests/PreviewPostRequest";
import { PostPreviewResponse } from "../Responses/PostPreviewResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { renderBody } from "../shapeDraft";

type PreviewPostResult = PostPreviewResponse | PostUnavailableResponse;

// The same render a save runs, without the save. One path for body HTML (D3), so the
// preview cannot drift from the page.
export class PreviewPostHandler implements IHandler<
  PreviewPostRequest,
  PreviewPostResult
> {
  constructor(private readonly content: IContentRenderEngine) {}

  async handle(request: PreviewPostRequest): Promise<PreviewPostResult> {
    const { correlationId, bodyMd } = request;
    const bodyHtml = await renderBody(this.content, bodyMd, { correlationId });
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }
    return new PostPreviewResponse(correlationId, bodyHtml);
  }
}
