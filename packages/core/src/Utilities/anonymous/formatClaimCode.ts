// The secret in groups of four with dashes, for reading and writing down. The inverse
// of `normalizeClaimCode`.
const GROUP = 4;

export function formatClaimCode(secret: string): string {
  const groups: string[] = [];
  for (let at = 0; at < secret.length; at += GROUP) {
    groups.push(secret.slice(at, at + GROUP));
  }
  return groups.join("-");
}
