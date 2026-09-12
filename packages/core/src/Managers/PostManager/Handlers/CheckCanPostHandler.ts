import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { CheckCanPostRequest } from "../Requests/CheckCanPostRequest";
import { CannotPostResponse } from "../Responses/CannotPostResponse";
import { CanPostResponse } from "../Responses/CanPostResponse";
import { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";

type CheckCanPostResult = CanPostResponse | CannotPostResponse | PostUnavailableResponse;

// The same rule CreateDraft applies, asked ahead of time so the editor entry point can
// hide (D20).
export class CheckCanPostHandler implements IHandler<
  CheckCanPostRequest,
  CheckCanPostResult
> {
  constructor(private readonly permissions: IPermissionEngine) {}

  async handle(request: CheckCanPostRequest): Promise<CheckCanPostResult> {
    const { correlationId, actor } = request;
    const refused = await permit(
      this.permissions,
      actor,
      "post.create",
      { kind: "site" },
      {
        correlationId,
      },
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
