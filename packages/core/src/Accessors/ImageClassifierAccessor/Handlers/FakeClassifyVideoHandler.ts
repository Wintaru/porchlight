import type { IHandler } from "../../../Common/IHandler";
import type { FakeImageClassifierState } from "../FakeImageClassifierState";
import type { ClassifyVideoRequest } from "../Requests/ClassifyVideoRequest";
import type { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import type { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";
import { fakeClassifiedResponse } from "./fakeClassifiedResponse";

// The same setting as for an image (#21). A video carries no flag marker: the fake
// never fetches the link, so the answer is IMAGE_CLASSIFIER_FAKE_RESULT alone.
export class FakeClassifyVideoHandler implements IHandler<
  ClassifyVideoRequest,
  ImageClassifiedResponse | ImageClassifierAccessFailedResponse
> {
  constructor(private readonly state: FakeImageClassifierState) {}

  handle(
    request: ClassifyVideoRequest,
  ): Promise<ImageClassifiedResponse | ImageClassifierAccessFailedResponse> {
    return Promise.resolve(
      fakeClassifiedResponse(request.correlationId, this.state.result),
    );
  }
}
