// What the toast says after `setFollow` redirects back with `?follow=<code>` (#24).
const FOLLOW_TEXT: Readonly<Record<string, string>> = {
  on: "Following. New posts show in your Following tab and your bell.",
  off: "Unfollowed.",
  failed: "That did not go through. Try again in a moment.",
};

export function followTextFor(code: string | undefined): string | undefined {
  return code === undefined ? undefined : FOLLOW_TEXT[code];
}
