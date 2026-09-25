import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { PostChanges } from "../../../Accessors/PostAccessor/PostChanges";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import { ResponseBase } from "../../../Common/ResponseBase";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { checkCover } from "../checkCover";
import { coverAwaitsReview } from "../coverAwaitsReview";
import { permit } from "../permit";
import { reviewStamp } from "../provenance";
import type { UpdateDraftRequest } from "../Requests/UpdateDraftRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRejectedResponse } from "../Responses/PostRejectedResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { renderBody, shapeTags } from "../shapeDraft";
import { unavailable } from "../unavailable";

type UpdateDraftResult =
  | PostResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostRejectedResponse
  | PostUnavailableResponse;

// Load, permission, then reshape only what changed: a new body is re-rendered, new tag
// names are re-slugged, a blank title is refused. The slug never moves (D11).
export class UpdateDraftHandler implements IHandler<
  UpdateDraftRequest,
  UpdateDraftResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
    private readonly mediaAssets: IMediaAssetAccessor,
  ) {}

  async handle(request: UpdateDraftRequest): Promise<UpdateDraftResult> {
    const { correlationId, actor, postId, changes, timestamp } = request;
    // One clock for the whole call: the store stamps the row with the request's time.
    const context = { correlationId, timestamp };

    const current = await loadPost(this.posts, { by: "id", id: postId }, context);
    if (!isPost(current)) {
      return current;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "post.edit",
      subjectOf(current),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    // A person's save is a review (D22); an agent's is not.
    const columns: PostChanges = reviewStamp(actor, timestamp);
    const shaped: { -readonly [K in keyof PostChanges]: PostChanges[K] } = columns;
    if (changes.title !== undefined) {
      const title = changes.title.trim();
      if (title === "") {
        return new PostRejectedResponse(correlationId, "title");
      }
      shaped.title = title;
    }
    if (changes.bodyMd !== undefined) {
      const bodyHtml = await renderBody(this.content, changes.bodyMd, context);
      if (typeof bodyHtml !== "string") {
        return bodyHtml;
      }
      shaped.bodyMd = changes.bodyMd;
      shaped.bodyHtml = bodyHtml;
    }
    if (changes.tags !== undefined) {
      const tags = await shapeTags(this.content, changes.tags, context);
      if (tags instanceof ResponseBase) {
        return tags;
      }
      shaped.tags = tags;
    }
    if (changes.summary !== undefined) shaped.summary = changes.summary;
    if (
      changes.coverMediaId !== undefined &&
      changes.coverMediaId !== current.coverMediaId
    ) {
      // Only a new cover is checked: a cover already on the post stays usable even if
      // the author's upload list has since changed around it.
      const authorId = current.author.kind === "member" ? current.author.profileId : "";
      const badCover = await checkCover(
        this.mediaAssets,
        authorId,
        changes.coverMediaId,
        context,
      );
      if (badCover !== undefined) {
        return badCover;
      }
      // A post already out (or in the queue) cannot take a cover a moderator has not
      // seen: nothing would send it to them, and the cover would never show. A draft
      // may, since publishing it sends the post to the queue (coverAwaitsReview).
      if (current.status !== "draft") {
        const held = await coverAwaitsReview(
          this.mediaAssets,
          changes.coverMediaId,
          context,
        );
        if (held === true) {
          return new PostRejectedResponse(correlationId, "cover");
        }
        if (held !== false) {
          return held;
        }
      }
      shaped.coverMediaId = changes.coverMediaId;
    }
    if (changes.visibility !== undefined) shaped.visibility = changes.visibility;
    if (changes.commentsEnabled !== undefined)
      shaped.commentsEnabled = changes.commentsEnabled;

    const stored = await this.posts.store(
      new StorePostChangesRequest(postId, columns, context),
    );
    if (stored instanceof PostStoredResponse) {
      return new PostResponse(correlationId, stored.post);
    }
    if (stored instanceof PostNotFoundResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    return unavailable(correlationId, stored, "store");
  }
}
