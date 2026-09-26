import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSiteIdentityRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSiteIdentityRequest";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import { SiteIdentityLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteIdentityLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import { RenderMarkdownRequest } from "../../../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../../../Engines/ContentRenderEngine/Responses/MarkdownRenderedResponse";
import type { GetAboutPageRequest } from "../Requests/GetAboutPageRequest";
import { AboutPageResponse } from "../Responses/AboutPageResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";

type Verdict = AboutPageResponse | SiteConfigUnavailableResponse;

// `/about` (SPEC.md §4): `about_md` rendered through the same engine and allowlist as a
// post body, so the admin's markdown shows as formatting and can carry nothing a post
// cannot. Rendered per request rather than cached: one admin-written page, and no
// `about_html` column to keep in step with `about_md`.
export class GetAboutPageHandler implements IHandler<GetAboutPageRequest, Verdict> {
  constructor(
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly content: IContentRenderEngine,
  ) {}

  async handle(request: GetAboutPageRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(
      new LoadSiteIdentityRequest({ correlationId }),
    );
    if (!(loaded instanceof SiteIdentityLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    const { aboutMd } = loaded.identity;
    if (aboutMd.trim() === "") {
      return new AboutPageResponse(correlationId, "");
    }
    const rendered = await this.content.transform(
      new RenderMarkdownRequest(aboutMd, { correlationId }),
    );
    if (!(rendered instanceof MarkdownRenderedResponse)) {
      return new SiteConfigUnavailableResponse(
        correlationId,
        `unexpected ${rendered.constructor.name} from transform`,
      );
    }
    return new AboutPageResponse(correlationId, rendered.html);
  }
}
