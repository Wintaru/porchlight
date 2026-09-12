// A member's trust (D7). Probation waits for approval on every post and comment; trusted
// publishes at once. Mirrors the `trust_level` enum in the schema.
export const TRUST_LEVELS = ["probation", "trusted"] as const;

export type TrustLevel = (typeof TRUST_LEVELS)[number];
