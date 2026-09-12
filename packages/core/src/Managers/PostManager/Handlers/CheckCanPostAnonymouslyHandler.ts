import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { CheckCanPostAnonymouslyRequest } from "../Requests/CheckCanPostAnonymouslyRequest";
import { CannotPostResponse } from "../Responses/CannotPostResponse";
import { CanPostResponse } from "../Responses/CanPostResponse";
import { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";

type CheckCanPostAnonymouslyResult =
  CanPostResponse | CannotPostResponse | PostUnavailableResponse;

// Same shape as CheckCanPostHandler, asked ahead of time so the write page can decide
// between the editor, the anonymous form and "sign in to post" (D20).
export class CheckCanPostAnonymouslyHandler implements IHandler<
  CheckCanPostAnonymouslyRequest,
  CheckCanPostAnonymouslyResult
> {
  constructor(private readonly permissions: IPermissionEngine) {}

  async handle(
    request: CheckCanPostAnonymouslyRequest,
  ): Promise<CheckCanPostAnonymouslyResult> {
    const { correlationId, actor } = request;
    const refused = await permit(
      this.permissions,
      actor,
      "post.create.anonymous",
      { kind: "site" },
      { correlationId },
    );
    if (refused === undefined) {
      return new CanPostResponse(correlationId);
    }
    if (refused instanceof PostForbiddenResponse) {
      return new CannotPostResponse(correlationId, refused.reason);
    }
    return refused;
  }
}
