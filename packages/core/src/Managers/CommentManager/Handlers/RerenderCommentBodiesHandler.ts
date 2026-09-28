import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentBodiesRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentBodiesRequest";
import { StoreCommentBodyHtmlRequest } from "../../../Accessors/CommentAccessor/Requests/StoreCommentBodyHtmlRequest";
import { CommentBodiesLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentBodiesLoadedResponse";
import { CommentBodyHtmlStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentBodyHtmlStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import { renderBody } from "../renderBody";
import type { RerenderCommentBodiesRequest } from "../Requests/RerenderCommentBodiesRequest";
import { CommentBodiesRerenderedResponse } from "../Responses/CommentBodiesRerenderedResponse";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import type { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { rerenderAll } from "../../../Utilities/rerender/rerenderAll";
import { unavailable } from "../unavailable";

type Result =
  CommentBodiesRerenderedResponse | CommentForbiddenResponse | CommentUnavailableResponse;

// Pages through every comment in id order (Utilities/rerender/rerenderAll, shared with
// the posts). The same render a save runs (D3), so the new HTML is what the next save
// would write anyway.
export class RerenderCommentBodiesHandler implements IHandler<
  RerenderCommentBodiesRequest,
  Result
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RerenderCommentBodiesRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
    const context = { correlationId, timestamp };
    const refused = await permit(
      this.permissions,
      actor,
      "site_config.manage",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const outcome = await rerenderAll<CommentUnavailableResponse>({
      loadPage: async (afterId, pageSize) => {
        const loaded = await this.comments.load(
          new LoadCommentBodiesRequest(afterId, pageSize, context),
        );
        return loaded instanceof CommentBodiesLoadedResponse
          ? loaded.bodies
          : { failure: unavailable(correlationId, loaded, "comments.load") };
      },
      render: async (bodyMd) => {
        const html = await renderBody(this.content, bodyMd, context);
        return typeof html === "string" ? html : { failure: html };
      },
      store: async (body, html) => {
        const stored = await this.comments.store(
          new StoreCommentBodyHtmlRequest(body.id, html, body.bodyMd, context),
        );
        return stored instanceof CommentBodyHtmlStoredResponse
          ? undefined
          : { failure: unavailable(correlationId, stored, "comments.store") };
      },
    });
    if (outcome.kind === "failed") {
      return outcome.failure;
    }
    return new CommentBodiesRerenderedResponse(
      correlationId,
      outcome.checked,
      outcome.changed,
    );
  }
}
