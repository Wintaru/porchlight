// Groups the raw secret for display, the inverse of what a visitor types back in on
// `/anon`. Display-only: `@porchlight/core`'s `normalizeClaimCode` strips grouping
// before it ever hashes anything, so this mirrors the core Utility's grouping width
// (4) without needing the Utility itself to cross the package boundary.
const GROUP = 4;

export function formatClaimCodeForDisplay(secret: string): string {
  const groups: string[] = [];
  for (let at = 0; at < secret.length; at += GROUP) {
    groups.push(secret.slice(at, at + GROUP));
  }
  return groups.join("-");
}
