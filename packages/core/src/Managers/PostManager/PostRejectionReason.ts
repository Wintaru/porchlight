// Why a draft was refused before any write. `title` means nothing in the title can
// become a slug; `tag` means one of the tags cannot; `cover` means the cover is not the
// author's own image, or a scan locked it; `body` means the body is longer than
// POST_BODY_MAX_LENGTH.
export const POST_REJECTION_REASONS = ["title", "tag", "cover", "body"] as const;

export type PostRejectionReason = (typeof POST_REJECTION_REASONS)[number];
