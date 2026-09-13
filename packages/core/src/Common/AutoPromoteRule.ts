// `site_config.auto_promote_after_approved_posts` (SPEC.md §4): the optional policy that
// promotes a probation member to `trusted` once they have this many approved posts.
// `null` is off, the shipped default — an admin opts in from the settings page.
export type AutoPromoteAfterApprovedPosts = number | null;

export const DEFAULT_AUTO_PROMOTE_AFTER_APPROVED_POSTS: AutoPromoteAfterApprovedPosts =
  null;

// A rule of zero would promote on the first post, which is not "after N approved
// posts" — the settings page floors an admin's input here.
export const MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS = 1;
