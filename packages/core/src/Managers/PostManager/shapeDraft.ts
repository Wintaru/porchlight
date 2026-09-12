import type { RequestContext } from "../../Common/RequestContext";
import type { Tag } from "../../Common/Tag";
import type { IContentRenderEngine } from "../../Engines/ContentRenderEngine/IContentRenderEngine";
import { DeriveSlugRequest } from "../../Engines/ContentRenderEngine/Requests/DeriveSlugRequest";
import { RenderMarkdownRequest } from "../../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";
import { MarkdownRenderedResponse } from "../../Engines/ContentRenderEngine/Responses/MarkdownRenderedResponse";
import { SlugDerivedResponse } from "../../Engines/ContentRenderEngine/Responses/SlugDerivedResponse";
import { SlugUnusableResponse } from "../../Engines/ContentRenderEngine/Responses/SlugUnusableResponse";
import { PostRejectedResponse } from "./Responses/PostRejectedResponse";
import type { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";
import { unavailable } from "./unavailable";

type Context = Required<Pick<RequestContext, "correlationId">>;

// Markdown to the HTML that is cached beside it (D3).
export async function renderBody(
  content: IContentRenderEngine,
  bodyMd: string,
  context: Context,
): Promise<string | PostUnavailableResponse> {
  const rendered = await content.transform(new RenderMarkdownRequest(bodyMd, context));
  if (rendered instanceof MarkdownRenderedResponse) {
    return rendered.html;
  }
  return unavailable(context.correlationId, rendered, "transform");
}

// Tag names as typed become {slug, name} pairs, deduplicated by slug. A name with no
// usable slug rejects the whole draft: the editor shows which one.
export async function shapeTags(
  content: IContentRenderEngine,
  names: readonly string[],
  context: Context,
): Promise<readonly Tag[] | PostRejectedResponse | PostUnavailableResponse> {
  const bySlug = new Map<string, Tag>();
  for (const raw of names) {
    const name = raw.trim();
    if (name === "") {
      continue;
    }
    const derived = await content.transform(new DeriveSlugRequest(name, 1, context));
    if (derived instanceof SlugUnusableResponse) {
      return new PostRejectedResponse(context.correlationId, "tag");
    }
    if (!(derived instanceof SlugDerivedResponse)) {
      return unavailable(context.correlationId, derived, "transform");
    }
    if (!bySlug.has(derived.slug)) {
      bySlug.set(derived.slug, { slug: derived.slug, name });
    }
  }
  return [...bySlug.values()];
}
