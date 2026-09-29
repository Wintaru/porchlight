// The longest summary in characters (D18, #118). The editor and the anonymous form cap
// their inputs at it, the MCP tools' schemas refuse a longer one, and the PostManager
// refuses it again, so a caller that skips its edge check still cannot store one.
// `public.post_excerpt` cuts a first sentence to the same length in SQL; a db test
// (packages/db/test/announced-posts.test.ts) fails if the two differ.
export const POST_SUMMARY_MAX_LENGTH = 200;
