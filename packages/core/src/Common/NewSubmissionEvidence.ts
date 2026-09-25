import type { TurnstileResult } from "./TurnstileResult";

// The evidence envelope for one write (SPEC.md §7), fully computed by the Manager
// before it ever reaches an Accessor: the salted hash and the retention deadline are
// business rules (the salt, the region window), not I/O, so they are never derived
// inside a store handler. `sourceIp` is null when no trustworthy address was available
// (docs/setup/turnstile.md's `TRUST_FORWARDED_FOR`) or the value was not an address,
// and `sourcePort` when the proxy reported none (parseClientAddress, #64). `ipHash`
// still gets computed either way so every submission groups into some bucket.
export interface NewSubmissionEvidence {
  readonly sourceIp: string | null;
  readonly sourcePort: number | null;
  readonly ipHash: string;
  readonly rawIpExpiresAt: Date;
  readonly userAgent: string | undefined;
  readonly turnstileResult: TurnstileResult;
  readonly originalFilename: string;
  readonly originalBytes: number;
  readonly sha256: string;
  readonly perceptualHash: string | null;
  readonly requestId: string;
  // The token when an agent uploaded it (D22, #31); null for a person at a form.
  readonly agentTokenId: string | null;
}
