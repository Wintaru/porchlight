import { type CoverFrame, isCoverFrameInRange } from "../../Common/CoverFrame";
import { POST_BODY_MAX_LENGTH } from "../../Common/PostBody";
import { POST_SUMMARY_MAX_LENGTH } from "../../Common/PostSummary";
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

// A body longer than the one limit every door shares (C19). The web forms and the MCP
// tools check it first; this is the check no caller can skip.
export function checkBodyLength(
  bodyMd: string,
  context: Context,
): PostRejectedResponse | undefined {
  return bodyMd.length > POST_BODY_MAX_LENGTH
    ? new PostRejectedResponse(context.correlationId, "body")
    : undefined;
}

// A framing the schema would refuse: a focus point off the picture, or a zoom out of
// range. Refused as a bad cover, before the store.
export function checkCoverFrame(
  frame: CoverFrame | undefined,
  context: Context,
): PostRejectedResponse | undefined {
  return frame === undefined || isCoverFrameInRange(frame)
    ? undefined
    : new PostRejectedResponse(context.correlationId, "cover");
}

// The summary as every door stores it (D18, #118): trimmed, and null when empty so the
// post falls back to its first sentence. A longer one than the shared limit is refused.
export function shapeSummary(
  summary: string | null,
  context: Context,
): string | null | PostRejectedResponse {
  const trimmed = summary?.trim() ?? "";
  if (trimmed.length > POST_SUMMARY_MAX_LENGTH) {
    return new PostRejectedResponse(context.correlationId, "summary");
  }
  return trimmed === "" ? null : trimmed;
}

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
