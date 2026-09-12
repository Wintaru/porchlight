// Where an upload sits in the safety pipeline (SPEC.md §7). Mirrors the `scan_status`
// enum in the schema. Every upload starts and stays `pending` until #10's scan pipeline
// runs; this issue never sets any other value.
export const SCAN_STATUSES = ["pending", "clear", "flagged", "locked"] as const;

export type ScanStatus = (typeof SCAN_STATUSES)[number];
