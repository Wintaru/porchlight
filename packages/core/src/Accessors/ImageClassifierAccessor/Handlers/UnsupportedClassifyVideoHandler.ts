import type { IHandler } from "../../../Common/IHandler";
import type { ClassifyVideoRequest } from "../Requests/ClassifyVideoRequest";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";

// A provider with no video scan built yet (#21). Every video upload fails its scan, so
// none goes up unscanned: scanning has no off switch (SPEC.md §7).
export class UnsupportedClassifyVideoHandler implements IHandler<
  ClassifyVideoRequest,
  ImageClassifierAccessFailedResponse
> {
  constructor(private readonly provider: string) {}

  handle(request: ClassifyVideoRequest): Promise<ImageClassifierAccessFailedResponse> {
    return Promise.resolve(
      new ImageClassifierAccessFailedResponse(
        request.correlationId,
        `IMAGE_CLASSIFIER_PROVIDER=${this.provider} cannot scan video yet`,
      ),
    );
  }
}
