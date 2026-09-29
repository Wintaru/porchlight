// What the toast says after `setMemberBlock` redirects back with `?block=<code>` (#23).
const BLOCK_TEXT: Readonly<Record<string, string>> = {
  mute: "Muted. Their posts and comments are hidden from you.",
  block:
    "Blocked. Their posts and comments are hidden, they cannot reply to you, and any follow between you has ended.",
  none: "Done. You see their posts and comments again. A follow that a block ended does not come back.",
  failed: "That did not go through. Try again in a moment.",
};

export function blockTextFor(code: string | undefined): string | undefined {
  // Own keys only: `?…=constructor` must not find Object.prototype's function.
  return code !== undefined && Object.hasOwn(BLOCK_TEXT, code)
    ? BLOCK_TEXT[code]
    : undefined;
}
