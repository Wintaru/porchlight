import type { ITagAccessor } from "../../../Accessors/TagAccessor/ITagAccessor";
import { LoadTagDescriptionRequest } from "../../../Accessors/TagAccessor/Requests/LoadTagDescriptionRequest";
import { TagAccessFailedResponse } from "../../../Accessors/TagAccessor/Responses/TagAccessFailedResponse";
import { TagDescriptionLoadedResponse } from "../../../Accessors/TagAccessor/Responses/TagDescriptionLoadedResponse";
import { TagNotFoundResponse } from "../../../Accessors/TagAccessor/Responses/TagNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import { RenderMarkdownRequest } from "../../../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../../../Engines/ContentRenderEngine/Responses/MarkdownRenderedResponse";
import type { GetTagDescriptionRequest } from "../Requests/GetTagDescriptionRequest";
import { NoSuchTagResponse } from "../Responses/NoSuchTagResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import { TagDescriptionResponse } from "../Responses/TagDescriptionResponse";

type Verdict = TagDescriptionResponse | NoSuchTagResponse | SiteConfigUnavailableResponse;

// Rendered through the same engine and allowlist as a post body, like `/about`, so an
// admin's markdown can carry nothing a post cannot (#24).
export class GetTagDescriptionHandler implements IHandler<
  GetTagDescriptionRequest,
  Verdict
> {
  constructor(
    private readonly tags: ITagAccessor,
    private readonly content: IContentRenderEngine,
  ) {}

  async handle(request: GetTagDescriptionRequest): Promise<Verdict> {
    const { correlationId, slug } = request;
    const loaded = await this.tags.load(
      new LoadTagDescriptionRequest(slug, { correlationId }),
    );
    if (loaded instanceof TagNotFoundResponse) {
      return new NoSuchTagResponse(correlationId);
    }
    if (!(loaded instanceof TagDescriptionLoadedResponse)) {
      return new SiteConfigUnavailableResponse(
        correlationId,
        loaded instanceof TagAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`,
      );
    }
    const markdown = loaded.descriptionMd ?? "";
    if (markdown.trim() === "") {
      return new TagDescriptionResponse(correlationId, "", "");
    }
    const rendered = await this.content.transform(
      new RenderMarkdownRequest(markdown, { correlationId }),
    );
    if (!(rendered instanceof MarkdownRenderedResponse)) {
      return new SiteConfigUnavailableResponse(
        correlationId,
        `unexpected ${rendered.constructor.name} from transform`,
      );
    }
    return new TagDescriptionResponse(correlationId, markdown, rendered.html);
  }
}
