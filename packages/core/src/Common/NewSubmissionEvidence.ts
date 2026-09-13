import type { TurnstileResult } from "./TurnstileResult";

// The evidence envelope for one write (SPEC.md §7), fully computed by the Manager
// before it ever reaches an Accessor: the salted hash and the retention deadline are
// business rules (the salt, the region window), not I/O, so they are never derived
// inside a store handler. `sourceIp` is the sentinel "unknown" when no trustworthy
// address was available (docs/setup/turnstile.md's `TRUST_FORWARDED_FOR`); the accessor
// turns that sentinel into a null column rather than an invalid `inet`, and `ipHash`
// still gets computed either way so every submission groups into some bucket.
export interface NewSubmissionEvidence {
  readonly sourceIp: string;
  readonly ipHash: string;
  readonly rawIpExpiresAt: Date;
  readonly userAgent: string | undefined;
  readonly turnstileResult: TurnstileResult;
  readonly originalFilename: string;
  readonly originalBytes: number;
  readonly sha256: string;
  readonly perceptualHash: string | null;
  readonly requestId: string;
}
