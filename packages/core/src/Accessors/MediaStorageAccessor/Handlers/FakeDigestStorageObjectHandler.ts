import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import { sha256HexOfBytes } from "../../../Utilities/media/sha256HexOfBytes";
import type { DigestStorageObjectRequest } from "../Requests/DigestStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDigestResponse } from "../Responses/StorageObjectDigestResponse";

type Result = StorageObjectDigestResponse | MediaStorageAccessFailedResponse;

export class FakeDigestStorageObjectHandler implements IHandler<
  DigestStorageObjectRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  async handle(request: DigestStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    if (this.state.failing) {
      return new MediaStorageAccessFailedResponse(
        correlationId,
        "MEDIA_STORAGE_FAKE_RESULT=fail",
      );
    }
    const bytes = this.state.objects.get(this.state.key(bucket, path));
    if (bytes === undefined) {
      return new MediaStorageAccessFailedResponse(
        correlationId,
        `no fake object at ${bucket}/${path}`,
      );
    }
    return new StorageObjectDigestResponse(
      correlationId,
      await sha256HexOfBytes(bytes),
      bytes.length,
    );
  }
}
