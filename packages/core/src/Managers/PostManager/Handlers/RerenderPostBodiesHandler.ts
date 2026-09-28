import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostBodiesRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostBodiesRequest";
import { StorePostBodyHtmlRequest } from "../../../Accessors/PostAccessor/Requests/StorePostBodyHtmlRequest";
import { PostBodiesLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostBodiesLoadedResponse";
import { PostBodyChangedSinceReadResponse } from "../../../Accessors/PostAccessor/Responses/PostBodyChangedSinceReadResponse";
import { PostBodyHtmlStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostBodyHtmlStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import { renderBody } from "../shapeDraft";
import type { RerenderPostBodiesRequest } from "../Requests/RerenderPostBodiesRequest";
import { PostBodiesRerenderedResponse } from "../Responses/PostBodiesRerenderedResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRerenderRejectedResponse } from "../Responses/PostRerenderRejectedResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { isRerenderRange, rerenderAll } from "../../../Utilities/rerender/rerenderAll";
import { unavailable } from "../unavailable";

type Result =
  | PostBodiesRerenderedResponse
  | PostForbiddenResponse
  | PostRerenderRejectedResponse
  | PostUnavailableResponse;

// Pages through the posts in id order, one budget at a time
// (Utilities/rerender/rerenderAll, shared with the comments). The same render a save
// runs (D3), so the new HTML is what the next save would write anyway.
export class RerenderPostBodiesHandler implements IHandler<
  RerenderPostBodiesRequest,
  Result
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RerenderPostBodiesRequest): Promise<Result> {
    const { correlationId, actor, timestamp, afterId, maxBodies } = request;
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
    const range = { afterId, maxBodies };
    if (!isRerenderRange(range)) {
      return new PostRerenderRejectedResponse(correlationId);
    }
    const outcome = await rerenderAll<PostUnavailableResponse>(
      {
        loadPage: async (after, pageSize) => {
          const loaded = await this.posts.load(
            new LoadPostBodiesRequest(after, pageSize, context),
          );
          return loaded instanceof PostBodiesLoadedResponse
            ? loaded.bodies
            : { failure: unavailable(correlationId, loaded, "posts.load") };
        },
        render: async (bodyMd) => {
          const html = await renderBody(this.content, bodyMd, context);
          return typeof html === "string" ? html : { failure: html };
        },
        store: async (body, html) => {
          const stored = await this.posts.store(
            new StorePostBodyHtmlRequest(body.id, html, body.bodyMd, context),
          );
          if (stored instanceof PostBodyHtmlStoredResponse) {
            return "written";
          }
          if (stored instanceof PostBodyChangedSinceReadResponse) {
            return "skipped";
          }
          return { failure: unavailable(correlationId, stored, "posts.store") };
        },
      },
      range,
    );
    if (outcome.kind === "failed") {
      return outcome.failure;
    }
    return new PostBodiesRerenderedResponse(
      correlationId,
      outcome.checked,
      outcome.changed,
      outcome.skipped,
      outcome.kind === "stopped" ? outcome.resumeAfterId : null,
    );
  }
}
