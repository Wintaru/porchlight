import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { NewComment } from "../../../Accessors/CommentAccessor/NewComment";
import { StoreNewCommentRequest } from "../../../Accessors/CommentAccessor/Requests/StoreNewCommentRequest";
import { CommentStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { Actor } from "../../../Common/Actor";
import { MAX_COMMENT_DEPTH } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import type { LiveComment } from "../../../Common/LiveComment";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadComment } from "../loadComment";
import { loadPost, postSubjectOf } from "../loadPost";
import { permit } from "../permit";
import { renderBody } from "../renderBody";
import type { CreateCommentRequest } from "../Requests/CreateCommentRequest";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentResponse } from "../Responses/CommentResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { unavailable } from "../unavailable";

type CreateCommentResult =
  | CommentResponse
  | CommentForbiddenResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// The handle an anonymous author is answered by. `anon` is a reserved handle (SPEC.md
// §5), so it can never name a real member.
const ANONYMOUS_MENTION = "anon";

// Where the reply lands and what it says. A reply to a comment at the depth cap sits
// beside it, under the same parent, and opens with a mention of who it answers (D10).
interface Placement {
  readonly parentId: string | null;
  readonly bodyMd: string;
}

// Permission (the post's switch and the site's `comments` key, D20), then the parent
// and the depth rule, then the render, then the write. Trust decides the status
// (SPEC.md §4). Anonymous authors arrive with #8; today the actor is a member.
export class CreateCommentHandler implements IHandler<
  CreateCommentRequest,
  CreateCommentResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: CreateCommentRequest): Promise<CreateCommentResult> {
    const { correlationId, actor, draft, timestamp } = request;
    // One clock for the whole call: the store stamps the row with the request's time.
    const context = { correlationId, timestamp };

    const post = await loadPost(this.posts, draft.postId, context);
    if (post instanceof CommentUnavailableResponse) {
      return post;
    }
    if (post === undefined) {
      return new CommentRejectedResponse(correlationId, "no-such-post");
    }
    const refused = await permit(
      this.permissions,
      actor,
      "comment.create",
      postSubjectOf(post),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      // The rule above already refused a visitor; this narrows the type for the author.
      return new CommentUnavailableResponse(
        correlationId,
        "comment.create granted to a visitor",
      );
    }
    const bodyMd = draft.bodyMd.trim();
    if (bodyMd === "") {
      return new CommentRejectedResponse(correlationId, "empty-body");
    }

    const placed = await this.place(draft.parentId, post.id, bodyMd, context);
    if (!isPlacement(placed)) {
      return placed;
    }
    const bodyHtml = await renderBody(this.content, placed.bodyMd, context);
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }

    const comment: NewComment = {
      postId: post.id,
      parentId: placed.parentId,
      author: { kind: "member", profileId: actor.profile.id },
      bodyMd: placed.bodyMd,
      bodyHtml,
      status: publishesAtOnce(actor) ? "visible" : "pending",
    };
    const stored = await this.comments.store(
      new StoreNewCommentRequest(comment, context),
    );
    if (stored instanceof CommentStoredResponse) {
      return new CommentResponse(correlationId, stored.comment);
    }
    return unavailable(correlationId, stored, "store");
  }

  // A root comment goes where it is. A reply needs a visible parent on this post; at
  // the cap it moves up one level and names the comment it answers.
  private async place(
    parentId: string | null,
    postId: string,
    bodyMd: string,
    context: Required<Pick<RequestContext, "correlationId">>,
  ): Promise<Placement | CommentRejectedResponse | CommentUnavailableResponse> {
    if (parentId === null) {
      return { parentId: null, bodyMd };
    }
    const parent = await loadComment(this.comments, parentId, context);
    if (parent instanceof CommentUnavailableResponse) {
      return parent;
    }
    if (parent?.postId !== postId || parent.status !== "visible") {
      return new CommentRejectedResponse(context.correlationId, "no-such-parent");
    }
    if (parent.depth < MAX_COMMENT_DEPTH) {
      return { parentId: parent.id, bodyMd };
    }
    const mention = await this.mentionFor(parent, context);
    if (mention instanceof CommentUnavailableResponse) {
      return mention;
    }
    return { parentId: parent.parentId, bodyMd: `@${mention} ${bodyMd}` };
  }

  private async mentionFor(
    parent: LiveComment,
    context: Required<Pick<RequestContext, "correlationId">>,
  ): Promise<string | CommentUnavailableResponse> {
    if (parent.author.kind === "anonymous") {
      return ANONYMOUS_MENTION;
    }
    const loaded = await this.profiles.load(
      new LoadProfileByIdRequest(parent.author.profileId, context),
    );
    if (loaded instanceof ProfileLoadedResponse) {
      return loaded.profile.handle;
    }
    if (loaded instanceof ProfileNotFoundResponse) {
      // A profile row outlives every state a member can be in (erasure keeps the
      // handle), so this is a broken reference, not a case with a name of its own.
      return new CommentUnavailableResponse(
        context.correlationId,
        `comment ${parent.id} names profile ${parent.author.profileId}, which is gone`,
      );
    }
    return unavailable(context.correlationId, loaded, "load");
  }
}

function isPlacement(
  value: Placement | CommentRejectedResponse | CommentUnavailableResponse,
): value is Placement {
  return (
    !(value instanceof CommentRejectedResponse) &&
    !(value instanceof CommentUnavailableResponse)
  );
}

// Trust decides (SPEC.md §4). Staff are trusted by definition.
function publishesAtOnce(actor: Actor & { readonly kind: "member" }): boolean {
  return actor.profile.trustLevel === "trusted" || actor.profile.role !== "member";
}
