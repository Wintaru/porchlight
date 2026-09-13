// ListQueue's filters (SPEC.md §7).
export const QUEUE_FILTERS = ["all", "anonymous", "probation", "flagged"] as const;

export type QueueFilter = (typeof QUEUE_FILTERS)[number];
