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
import { unavailable } from "../unavailable";

type Result =
  CommentBodiesRerenderedResponse | CommentForbiddenResponse | CommentUnavailableResponse;

// Pages through every comment in id order. The same render a save runs (D3), so the new
// HTML is what the next save would write anyway. The same loop lives in the other
// Manager for the other table (a Manager may not call another): keep the two in step.
const PAGE = 100;

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
    let checked = 0;
    let changed = 0;
    let afterId: string | null = null;
    for (;;) {
      const loaded = await this.comments.load(
        new LoadCommentBodiesRequest(afterId, PAGE, context),
      );
      if (!(loaded instanceof CommentBodiesLoadedResponse)) {
        return unavailable(correlationId, loaded, "comments.load");
      }
      if (loaded.bodies.length === 0) {
        break;
      }
      for (const body of loaded.bodies) {
        checked += 1;
        const html = await renderBody(this.content, body.bodyMd, context);
        if (typeof html !== "string") {
          return html;
        }
        if (html !== body.bodyHtml) {
          const stored = await this.comments.store(
            new StoreCommentBodyHtmlRequest(body.id, html, body.bodyMd, context),
          );
          if (!(stored instanceof CommentBodyHtmlStoredResponse)) {
            return unavailable(correlationId, stored, "comments.store");
          }
          changed += 1;
        }
      }
      afterId = loaded.bodies.at(-1)?.id ?? null;
    }
    return new CommentBodiesRerenderedResponse(correlationId, checked, changed);
  }
}
