// HTTP Basic auth from Shield's "username:password" (HASH_MATCH_API_KEY). UTF-8 first:
// `btoa` alone throws on a password with a character outside Latin-1.
export function shieldAuthorization(credentials: string): string {
  const utf8 = String.fromCharCode(...new TextEncoder().encode(credentials));
  return `Basic ${btoa(utf8)}`;
}
