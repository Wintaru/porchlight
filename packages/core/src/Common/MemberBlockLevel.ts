// How far one member shuts out another (#23). `mute` hides the other member's posts
// from your lists and their comments from your threads. `block` does that and also
// stops them commenting on your posts and replying to your comments. Mirrors the
// `member_block_level` enum (toMemberBlock.test.ts keeps the two equal).
export const MEMBER_BLOCK_LEVELS = ["mute", "block"] as const;

export type MemberBlockLevel = (typeof MEMBER_BLOCK_LEVELS)[number];
