// Why a draft was refused before any write. `title` means nothing in the title can
// become a slug; `tag` means one of the tags cannot; `cover` means the cover is not the
// author's own image, or a scan locked it; `body` means the body is longer than
// POST_BODY_MAX_LENGTH; `summary` means the summary is longer than
// POST_SUMMARY_MAX_LENGTH. `reported` means the post has a report no moderator has
// decided, so it may not turn private yet (D27); `visibility` means a save with no
// request origin (an autosave) tried to take a private post public, which is a publish.
export const POST_REJECTION_REASONS = [
  "title",
  "tag",
  "cover",
  "body",
  "summary",
  "reported",
  "visibility",
] as const;

export type PostRejectionReason = (typeof POST_REJECTION_REASONS)[number];
