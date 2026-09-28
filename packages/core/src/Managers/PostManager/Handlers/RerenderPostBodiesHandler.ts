import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostBodiesRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostBodiesRequest";
import { StorePostBodyHtmlRequest } from "../../../Accessors/PostAccessor/Requests/StorePostBodyHtmlRequest";
import { PostBodiesLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostBodiesLoadedResponse";
import { PostBodyHtmlStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostBodyHtmlStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import { renderBody } from "../shapeDraft";
import type { RerenderPostBodiesRequest } from "../Requests/RerenderPostBodiesRequest";
import { PostBodiesRerenderedResponse } from "../Responses/PostBodiesRerenderedResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { rerenderAll } from "../../../Utilities/rerender/rerenderAll";
import { unavailable } from "../unavailable";

type Result =
  PostBodiesRerenderedResponse | PostForbiddenResponse | PostUnavailableResponse;

// Pages through every post in id order (Utilities/rerender/rerenderAll, shared with
// the comments). The same render a save runs (D3), so the new HTML is what the next
// save would write anyway.
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
    const outcome = await rerenderAll<PostUnavailableResponse>({
      loadPage: async (afterId, pageSize) => {
        const loaded = await this.posts.load(
          new LoadPostBodiesRequest(afterId, pageSize, context),
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
        return stored instanceof PostBodyHtmlStoredResponse
          ? undefined
          : { failure: unavailable(correlationId, stored, "posts.store") };
      },
    });
    if (outcome.kind === "failed") {
      return outcome.failure;
    }
    return new PostBodiesRerenderedResponse(
      correlationId,
      outcome.checked,
      outcome.changed,
    );
  }
}
