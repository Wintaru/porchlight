import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { StoreNewPostRequest } from "../../../Accessors/PostAccessor/Requests/StoreNewPostRequest";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostSlugTakenResponse } from "../../../Accessors/PostAccessor/Responses/PostSlugTakenResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IAnonymousGuardEngine } from "../../../Engines/AnonymousGuardEngine/IAnonymousGuardEngine";
import { AdmitAnonymousSubmissionRequest } from "../../../Engines/AnonymousGuardEngine/Requests/AdmitAnonymousSubmissionRequest";
import { AnonymousAdmittedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousAdmittedResponse";
import { AnonymousGuardDeniedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousGuardDeniedResponse";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import { DeriveSlugRequest } from "../../../Engines/ContentRenderEngine/Requests/DeriveSlugRequest";
import { SlugDerivedResponse } from "../../../Engines/ContentRenderEngine/Responses/SlugDerivedResponse";
import { SlugUnusableResponse } from "../../../Engines/ContentRenderEngine/Responses/SlugUnusableResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { IHandler } from "../../../Common/IHandler";
import { notifyStaffOfPendingPost } from "../notifyStaff";
import { permit } from "../permit";
import type { CreateAnonymousPostRequest } from "../Requests/CreateAnonymousPostRequest";
import { AnonymousPostCreatedResponse } from "../Responses/AnonymousPostCreatedResponse";
import { PostGuardRefusedResponse } from "../Responses/PostGuardRefusedResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRejectedResponse } from "../Responses/PostRejectedResponse";
import { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { renderBody } from "../shapeDraft";
import { unavailable } from "../unavailable";

// How many slug candidates to try before giving up (the same bound CreateDraftHandler
// uses). Every candidate after the first carries a numeric suffix.
const MAX_SLUG_ATTEMPTS = 20;

type CreateAnonymousPostResult =
  | AnonymousPostCreatedResponse
  | PostForbiddenResponse
  | PostGuardRefusedResponse
  | PostRejectedResponse
  | PostUnavailableResponse;

// The D20 permission gate, then the D15 admission guard, then the shape of the post
// (slug, HTML), then the write. A post starts and stays `pending`: unlike a member's
// draft, there is no publish step to reach it from, so the insert's default `draft` is
// moved to `pending` in a second write rather than teaching the insert path a status
// only this one caller ever sends.
export class CreateAnonymousPostHandler implements IHandler<
  CreateAnonymousPostRequest,
  CreateAnonymousPostResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly profiles: IProfileAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly guard: IAnonymousGuardEngine,
  ) {}

  async handle(request: CreateAnonymousPostRequest): Promise<CreateAnonymousPostResult> {
    const { correlationId, actor, draft, submission, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "post.create.anonymous",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const admitted = await this.guard.evaluate(
      new AdmitAnonymousSubmissionRequest("post", submission, context),
    );
    if (admitted instanceof AnonymousGuardDeniedResponse) {
      return new PostGuardRefusedResponse(correlationId, admitted.reason);
    }
    if (!(admitted instanceof AnonymousAdmittedResponse)) {
      return unavailable(correlationId, admitted, "guard.evaluate");
    }

    const bodyHtml = await renderBody(this.content, draft.bodyMd, context);
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }

    const stored = await this.storeNewPost(
      admitted.author.id,
      draft.title,
      draft.bodyMd,
      bodyHtml,
      draft.summary,
      context,
    );
    if (!(stored instanceof PostStoredResponse)) {
      return stored;
    }

    const moved = await this.posts.store(
      new StorePostChangesRequest(
        stored.post.id,
        { status: "pending", publishedAt: null },
        context,
      ),
    );
    if (!(moved instanceof PostStoredResponse)) {
      return unavailable(correlationId, moved, "store");
    }
    const notified = await notifyStaffOfPendingPost(
      this.profiles,
      this.notifications,
      stored.post.id,
      context,
    );
    if (notified !== undefined) {
      return notified;
    }
    return new AnonymousPostCreatedResponse(
      correlationId,
      moved.post,
      admitted.secret,
      admitted.isNewAuthor,
    );
  }

  private async storeNewPost(
    anonymousAuthorId: string,
    title: string,
    bodyMd: string,
    bodyHtml: string,
    summary: string | null,
    context: Required<Pick<CreateAnonymousPostRequest, "correlationId" | "timestamp">>,
  ): Promise<PostStoredResponse | PostRejectedResponse | PostUnavailableResponse> {
    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
      const derived = await this.content.transform(
        new DeriveSlugRequest(title, attempt, context),
      );
      if (derived instanceof SlugUnusableResponse) {
        return new PostRejectedResponse(context.correlationId, "title");
      }
      if (!(derived instanceof SlugDerivedResponse)) {
        return unavailable(context.correlationId, derived, "transform");
      }
      const stored = await this.posts.store(
        new StoreNewPostRequest(
          {
            author: { kind: "anonymous", anonymousAuthorId },
            slug: derived.slug,
            title: title.trim(),
            bodyMd,
            bodyHtml,
            summary,
            visibility: "public",
            commentsEnabled: true,
            tags: [],
            // An anonymous visitor is a person at a form, never an agent (D22).
            origin: "editor",
            agentTokenId: null,
            reviewedAt: context.timestamp,
          },
          context,
        ),
      );
      if (stored instanceof PostStoredResponse) {
        return stored;
      }
      if (!(stored instanceof PostSlugTakenResponse)) {
        return unavailable(context.correlationId, stored, "store");
      }
    }
    return new PostUnavailableResponse(
      context.correlationId,
      `no free slug for "${title}" after ${String(MAX_SLUG_ATTEMPTS)} attempts`,
    );
  }
}
