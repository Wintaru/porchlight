import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { MediaKind } from "../../Common/MediaKind";

// What FinalizeUploadHandler already knows once the real bytes have been read back and
// sniffed: an id it minted for the storage path (RequestUploadUrlHandler's own doc
// comment explains why), and the hash and size of what is actually sitting in
// quarantine. `scan_status` defaults to `pending` at the schema level and needs no
// value here — #10 is the only thing that ever changes it.
export interface NewMediaAsset {
  readonly id: string;
  readonly owner: ContentAuthor;
  readonly storagePath: string;
  readonly kind: MediaKind;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly bytes: number;
  readonly sha256: string;
}
