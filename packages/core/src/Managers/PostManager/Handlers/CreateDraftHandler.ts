import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { StoreNewPostRequest } from "../../../Accessors/PostAccessor/Requests/StoreNewPostRequest";
import { PostSlugTakenResponse } from "../../../Accessors/PostAccessor/Responses/PostSlugTakenResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import { ResponseBase } from "../../../Common/ResponseBase";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import { DeriveSlugRequest } from "../../../Engines/ContentRenderEngine/Requests/DeriveSlugRequest";
import { SlugDerivedResponse } from "../../../Engines/ContentRenderEngine/Responses/SlugDerivedResponse";
import { SlugUnusableResponse } from "../../../Engines/ContentRenderEngine/Responses/SlugUnusableResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import { provenanceOf } from "../provenance";
import type { CreateDraftRequest } from "../Requests/CreateDraftRequest";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRejectedResponse } from "../Responses/PostRejectedResponse";
import { PostResponse } from "../Responses/PostResponse";
import { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { renderBody, shapeTags } from "../shapeDraft";
import { unavailable } from "../unavailable";

// How many slug candidates to try before giving up. Every candidate after the first
// carries a numeric suffix, so this many collisions means something else is wrong.
const MAX_SLUG_ATTEMPTS = 20;

type CreateDraftResult =
  PostResponse | PostForbiddenResponse | PostRejectedResponse | PostUnavailableResponse;

// Permission, then the shape of the draft (slug, tags, HTML), then the write, retried
// with the next slug while the store says the slug is taken. The store's unique
// constraint is the last word, so two members titling a post the same way never race
// into a duplicate.
export class CreateDraftHandler implements IHandler<
  CreateDraftRequest,
  CreateDraftResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: CreateDraftRequest): Promise<CreateDraftResult> {
    const { correlationId, actor, draft, timestamp } = request;
    // One clock for the whole call: the store stamps the row with the request's time.
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "post.create",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      // The rule above already refused a visitor; this narrows the type for the author.
      return new PostUnavailableResponse(
        correlationId,
        "post.create granted to a visitor",
      );
    }

    const tags = await shapeTags(this.content, draft.tags, context);
    if (tags instanceof ResponseBase) {
      return tags;
    }
    const bodyHtml = await renderBody(this.content, draft.bodyMd, context);
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
      const derived = await this.content.transform(
        new DeriveSlugRequest(draft.title, attempt, context),
      );
      if (derived instanceof SlugUnusableResponse) {
        return new PostRejectedResponse(correlationId, "title");
      }
      if (!(derived instanceof SlugDerivedResponse)) {
        return unavailable(correlationId, derived, "transform");
      }
      const stored = await this.posts.store(
        new StoreNewPostRequest(
          {
            author: { kind: "member", profileId: actor.profile.id },
            slug: derived.slug,
            title: draft.title.trim(),
            bodyMd: draft.bodyMd,
            bodyHtml,
            summary: draft.summary,
            visibility: draft.visibility,
            commentsEnabled: draft.commentsEnabled,
            tags,
            ...provenanceOf(actor, timestamp),
          },
          context,
        ),
      );
      if (stored instanceof PostStoredResponse) {
        return new PostResponse(correlationId, stored.post);
      }
      if (!(stored instanceof PostSlugTakenResponse)) {
        return unavailable(correlationId, stored, "store");
      }
    }
    return new PostUnavailableResponse(
      correlationId,
      `no free slug for "${draft.title}" after ${String(MAX_SLUG_ATTEMPTS)} attempts`,
    );
  }
}
