// Who may write a comment, from `site_config.comments` (D20, SPEC.md §4). `anyone`
// allows anonymous authors once #8 lands; `members` needs a session; `off` refuses every
// new comment and hides the form, while existing comments stay visible. Missing from the
// store means `anyone` until #12 seeds the key.
export const COMMENT_POLICIES = ["anyone", "members", "off"] as const;

export type CommentPolicy = (typeof COMMENT_POLICIES)[number];

export const DEFAULT_COMMENT_POLICY: CommentPolicy = "anyone";
