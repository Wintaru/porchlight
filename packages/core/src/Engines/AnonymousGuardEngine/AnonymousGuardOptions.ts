// What the composition root pins on every evaluation (SPEC.md Sec4, D15). The salt never
// rotates once a deployment has data (old hashes would stop matching); the two caps are
// generous fixed-window limits, not a per-person quota.
export interface AnonymousGuardOptions {
  readonly ipHashSalt: string;
  readonly perIpPerHour: number;
  readonly perTokenPerHour: number;
}
