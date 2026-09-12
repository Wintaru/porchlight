// Broad shape of an upload (SPEC.md §6). Mirrors the `media_kind` enum in the schema.
// Video is phase 2 (#21); the value exists here because the enum already carries it.
export const MEDIA_KINDS = ["image", "document", "model", "track", "video"] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];
