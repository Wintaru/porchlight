// What the toast says after `setMemberBlock` redirects back with `?block=<code>` (#23).
const BLOCK_TEXT: Readonly<Record<string, string>> = {
  mute: "Muted. Their posts and comments are hidden from you.",
  block: "Blocked. Their posts and comments are hidden, and they cannot reply to you.",
  none: "Done. You see their posts and comments again.",
  failed: "That did not go through. Try again in a moment.",
};

export function blockTextFor(code: string | undefined): string | undefined {
  // Own keys only: `?…=constructor` must not find Object.prototype's function.
  return code !== undefined && Object.hasOwn(BLOCK_TEXT, code)
    ? BLOCK_TEXT[code]
    : undefined;
}
