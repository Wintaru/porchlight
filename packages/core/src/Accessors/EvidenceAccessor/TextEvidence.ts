import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { TurnstileResult } from "../../Common/TurnstileResult";

// One `submission_evidence` row for a post or a comment (SPEC.md §7, #61). An upload's
// row is written by `finalize_media_scan` with the upload itself; this is the text
// equivalent. `sourceIp` is null when the address is not known (no trusted proxy, or
// not an address); `sourcePort` when the proxy reported one.
// `sha256` is the text as it was first stored.
export interface TextEvidence {
  readonly subject: { readonly kind: "post" | "comment"; readonly id: string };
  readonly author: ContentAuthor;
  // The token when an agent wrote it (D22); null for a person at a form.
  readonly agentTokenId: string | null;
  readonly sourceIp: string | null;
  readonly sourcePort: number | null;
  readonly ipHash: string;
  readonly rawIpExpiresAt: Date;
  readonly userAgent: string | undefined;
  readonly turnstileResult: TurnstileResult;
  readonly sha256: string;
  readonly requestId: string;
}
