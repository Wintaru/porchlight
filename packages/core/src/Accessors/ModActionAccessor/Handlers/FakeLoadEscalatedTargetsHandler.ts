import type { IHandler } from "../../../Common/IHandler";
import type { FakeModActionState } from "../FakeModActionState";
import type { LoadEscalatedTargetsRequest } from "../Requests/LoadEscalatedTargetsRequest";
import { EscalatedTargetsLoadedResponse } from "../Responses/EscalatedTargetsLoadedResponse";
import { ModActionAccessFailedResponse } from "../Responses/ModActionAccessFailedResponse";

export class FakeLoadEscalatedTargetsHandler implements IHandler<
  LoadEscalatedTargetsRequest,
  EscalatedTargetsLoadedResponse | ModActionAccessFailedResponse
> {
  constructor(private readonly state: FakeModActionState) {}

  handle(
    request: LoadEscalatedTargetsRequest,
  ): Promise<EscalatedTargetsLoadedResponse | ModActionAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ModActionAccessFailedResponse(
          request.correlationId,
          "MOD_ACTION_FAKE_RESULT=fail",
        ),
      );
    }
    const askedPosts = new Set(
      request.targets.filter((t) => t.kind === "post").map((t) => t.id),
    );
    const askedComments = new Set(
      request.targets.filter((t) => t.kind === "comment").map((t) => t.id),
    );
    const postIds = new Set<string>();
    const commentIds = new Set<string>();
    for (const { action, target } of this.state.actions) {
      if (action !== "escalate") {
        continue;
      }
      if (target.kind === "post" && askedPosts.has(target.id)) {
        postIds.add(target.id);
      } else if (target.kind === "comment" && askedComments.has(target.id)) {
        commentIds.add(target.id);
      }
    }
    return Promise.resolve(
      new EscalatedTargetsLoadedResponse(request.correlationId, postIds, commentIds),
    );
  }
}
