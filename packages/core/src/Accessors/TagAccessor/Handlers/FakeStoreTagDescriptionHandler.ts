import type { IHandler } from "../../../Common/IHandler";
import type { FakeTagState } from "../FakeTagState";
import type { StoreTagDescriptionRequest } from "../Requests/StoreTagDescriptionRequest";
import { TagAccessFailedResponse } from "../Responses/TagAccessFailedResponse";
import { TagDescriptionStoredResponse } from "../Responses/TagDescriptionStoredResponse";

// The fake has no tags of its own, so a store creates the tag it names.
export class FakeStoreTagDescriptionHandler implements IHandler<
  StoreTagDescriptionRequest,
  TagDescriptionStoredResponse | TagAccessFailedResponse
> {
  constructor(private readonly state: FakeTagState) {}

  handle(
    request: StoreTagDescriptionRequest,
  ): Promise<TagDescriptionStoredResponse | TagAccessFailedResponse> {
    const { slug, descriptionMd, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new TagAccessFailedResponse(correlationId, "TAG_FAKE_RESULT=fail"),
      );
    }
    this.state.descriptions.set(slug, descriptionMd);
    return Promise.resolve(new TagDescriptionStoredResponse(correlationId));
  }
}
