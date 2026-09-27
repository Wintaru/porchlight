import type { IHandler } from "../../../Common/IHandler";
import type { FakeTagState } from "../FakeTagState";
import type { LoadTagDescriptionRequest } from "../Requests/LoadTagDescriptionRequest";
import { TagAccessFailedResponse } from "../Responses/TagAccessFailedResponse";
import { TagDescriptionLoadedResponse } from "../Responses/TagDescriptionLoadedResponse";
import { TagNotFoundResponse } from "../Responses/TagNotFoundResponse";

type Result =
  TagDescriptionLoadedResponse | TagNotFoundResponse | TagAccessFailedResponse;

export class FakeLoadTagDescriptionHandler implements IHandler<
  LoadTagDescriptionRequest,
  Result
> {
  constructor(private readonly state: FakeTagState) {}

  handle(request: LoadTagDescriptionRequest): Promise<Result> {
    const { slug, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new TagAccessFailedResponse(correlationId, "TAG_FAKE_RESULT=fail"),
      );
    }
    if (!this.state.descriptions.has(slug)) {
      return Promise.resolve(new TagNotFoundResponse(correlationId));
    }
    return Promise.resolve(
      new TagDescriptionLoadedResponse(
        correlationId,
        this.state.descriptions.get(slug) ?? null,
      ),
    );
  }
}
