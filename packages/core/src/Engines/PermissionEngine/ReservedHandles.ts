// Handles nobody may take (SPEC.md §5, D11): the four named in the spec plus every
// top-level route of the site, so `/@handle` can never shadow a page. A route folder
// under apps/web/src/app that is missing here fails packages/core/test/reserved-handles.
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Named in the spec.
  "anon",
  "p",
  "admin",
  "mod",
  // Routes that exist or that the approved boards call for.
  "api",
  "auth",
  "settings",
  "tags",
  "about",
  "write",
  "queue",
  "notifications",
  "search",
  "sitemap",
  "rss",
  "feed",
  "terms",
  "conduct",
  "policy",
  "help",
  // Common guesses that would confuse a reader even before a route exists.
  "porchlight",
  "me",
  "new",
  "edit",
  "login",
  "logout",
  "signin",
  "signout",
  "static",
  "public",
  "robots",
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle);
}
