import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { MediaKind } from "../../Common/MediaKind";
import type { ScanStatus } from "../../Common/ScanStatus";

// What FinalizeUploadHandler already knows once the real bytes have been read back,
// sniffed, and run through #10's scan pipeline: an id it minted for the storage path
// (RequestUploadUrlHandler's own doc comment explains why), the hash and size of what
// is actually sitting in quarantine, and the pipeline's own verdict. `scanStatus` is
// never `pending` here — the row is only ever written once the pipeline has run.
export interface NewMediaAsset {
  readonly id: string;
  readonly owner: ContentAuthor;
  readonly storagePath: string;
  readonly kind: MediaKind;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly scanStatus: Exclude<ScanStatus, "pending">;
  readonly retainUntil: Date | null;
}
