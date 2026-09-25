// Why an upload gets no public copy. `not-cleared`: the scan has not cleared it, or a
// moderator has not approved a flagged one as mature (pending and locked never publish
// — the `media_assets_published_only_when_scanned` CHECK). `undecodable`: an image whose
// bytes passed the magic-byte check but do not decode.
export const MEDIA_UNPUBLISHABLE_REASONS = ["not-cleared", "undecodable"] as const;

export type MediaUnpublishableReason = (typeof MEDIA_UNPUBLISHABLE_REASONS)[number];
