// Why a draft was refused before any write. `title` means nothing in the title can
// become a slug; `tag` means one of the tags cannot.
export const POST_REJECTION_REASONS = ["title", "tag"] as const;

export type PostRejectionReason = (typeof POST_REJECTION_REASONS)[number];
