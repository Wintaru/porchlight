import type { IHandler } from "../../../Common/IHandler";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { StoreNewMediaAssetRequest } from "../Requests/StoreNewMediaAssetRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetStoredResponse } from "../Responses/MediaAssetStoredResponse";

export class FakeStoreNewMediaAssetHandler implements IHandler<
  StoreNewMediaAssetRequest,
  MediaAssetStoredResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(
    request: StoreNewMediaAssetRequest,
  ): Promise<MediaAssetStoredResponse | MediaAssetAccessFailedResponse> {
    const { asset, evidence, auditEvent, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    const stored: MediaAsset = {
      id: asset.id,
      owner: asset.owner,
      storagePath: asset.storagePath,
      publishedPath: null,
      kind: asset.kind,
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename,
      bytes: asset.bytes,
      sha256: asset.sha256,
      scanStatus: asset.scanStatus,
      retainUntil: asset.retainUntil,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.assets.set(stored.id, stored);
    this.state.evidence.push(evidence);
    if (auditEvent !== undefined) {
      this.state.auditEvents.push(auditEvent);
    }
    return Promise.resolve(new MediaAssetStoredResponse(correlationId, stored));
  }
}
