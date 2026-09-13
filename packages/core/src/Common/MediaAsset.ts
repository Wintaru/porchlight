import type { ContentAuthor } from "./ContentAuthor";
import type { MediaKind } from "./MediaKind";
import type { ScanStatus } from "./ScanStatus";

// An upload as every layer sees it (SPEC.md §6, §7). `storagePath` is the quarantine
// object, never handed to a browser directly; `publishedPath` is the re-encoded, public
// copy #10/#11 create on approval and stays null until then. The owner reuses
// `ContentAuthor` (D7): a member's upload and an anonymous one are the same shape a post
// or comment already uses.
export interface MediaAsset {
  readonly id: string;
  readonly owner: ContentAuthor;
  readonly storagePath: string;
  readonly publishedPath: string | null;
  readonly kind: MediaKind;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly scanStatus: ScanStatus;
  // Set by ApproveAsMature (#11). Artistic nudity may be approved only with this tag
  // (SPEC.md §7); mature items render blurred with click-to-reveal regardless of
  // publication state.
  readonly mature: boolean;
  readonly retainUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
