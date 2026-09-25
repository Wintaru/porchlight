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
  // Tag pages: /t/slug. Too short to ever be a handle, listed so the guard test holds.
  "t",
  "tags",
  "about",
  "write",
  "queue",
  "notifications",
  "search",
  "sitemap",
  "rss",
  "feed",
  // The site feed's actual route (SPEC.md §9, D21): apps/web/src/app/feed.xml.
  "feed.xml",
  "terms",
  "code-of-conduct",
  "conduct",
  "policy",
  "help",
  // The report form for a post or a comment (#40).
  "report",
  // Where the proxy sends an erased author's pages (D11); a 404 when opened directly.
  "erased-author",
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
