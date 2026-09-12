// Who may write a post, from `site_config.posting` (D20, SPEC.md §4). `anyone` allows
// anonymous authors once #8 lands; `members` needs a session; `staff` is admins and
// moderators. Missing from the store means `anyone` until #12 seeds the key.
export const POSTING_POLICIES = ["anyone", "members", "staff"] as const;

export type PostingPolicy = (typeof POSTING_POLICIES)[number];

export const DEFAULT_POSTING_POLICY: PostingPolicy = "anyone";
