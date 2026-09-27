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
import { unavailable } from "../unavailable";

type Result =
  PostBodiesRerenderedResponse | PostForbiddenResponse | PostUnavailableResponse;

// Pages through every post in id order. The same render a save runs (D3), so the new
// HTML is what the next save would write anyway. The same loop lives in the other
// Manager for the other table (a Manager may not call another): keep the two in step.
const PAGE = 100;

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
    let checked = 0;
    let changed = 0;
    let afterId: string | null = null;
    for (;;) {
      const loaded = await this.posts.load(
        new LoadPostBodiesRequest(afterId, PAGE, context),
      );
      if (!(loaded instanceof PostBodiesLoadedResponse)) {
        return unavailable(correlationId, loaded, "posts.load");
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
          const stored = await this.posts.store(
            new StorePostBodyHtmlRequest(body.id, html, body.bodyMd, context),
          );
          if (!(stored instanceof PostBodyHtmlStoredResponse)) {
            return unavailable(correlationId, stored, "posts.store");
          }
          changed += 1;
        }
      }
      afterId = loaded.bodies.at(-1)?.id ?? null;
    }
    return new PostBodiesRerenderedResponse(correlationId, checked, changed);
  }
}
