import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { StoreMediaAssetChangesRequest } from "../Requests/StoreMediaAssetChangesRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetNotFoundResponse } from "../Responses/MediaAssetNotFoundResponse";
import { MediaAssetStoredResponse } from "../Responses/MediaAssetStoredResponse";

export class FakeStoreMediaAssetChangesHandler implements IHandler<
  StoreMediaAssetChangesRequest,
  MediaAssetStoredResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(
    request: StoreMediaAssetChangesRequest,
  ): Promise<
    MediaAssetStoredResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse
  > {
    const { id, changes, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.assets.get(id);
    if (current === undefined) {
      return Promise.resolve(new MediaAssetNotFoundResponse(correlationId, id));
    }
    const stored = { ...current, mature: changes.mature ?? current.mature };
    this.state.assets.set(id, stored);
    return Promise.resolve(new MediaAssetStoredResponse(correlationId, stored));
  }
}
