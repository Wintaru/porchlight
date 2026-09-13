// The admin's region choice at setup (SPEC.md §7). Wires the reporting target, the
// deadline text, and the retention window; "other" shows the maximum-caution defaults
// and a plain warning to consult local law. Missing from the store means this default
// until #12 seeds the key, the same fallback every other D20 key uses.
export const REGIONS = ["US", "EU", "UK", "CA", "AU", "other"] as const;

export type Region = (typeof REGIONS)[number];

export const DEFAULT_REGION: Region = "other";
