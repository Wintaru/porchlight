import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Turns an approved upload into its public copy (SPEC.md §6, §7, #36): an image
// re-encoded with its metadata stripped, any other file copied as it is (it is only ever
// linked as a download), written to the public bucket, its path recorded on the row. The
// original in quarantine is never served.
export interface IMediaPublishEngine {
  transform(request: RequestBase): Promise<ResponseBase>;
}
