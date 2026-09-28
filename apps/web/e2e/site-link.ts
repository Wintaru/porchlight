import { expect, type Page } from "@playwright/test";

// Supabase Auth builds its links from the local stack's site_url (supabase/config.toml),
// which is port 3000. The suite can run on any port (PORT), so a test follows such a link
// on its own server: the path and the query only, which `page.goto` resolves against
// Playwright's baseURL (#99).
export function onThisServer(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}${url.hash}`;
}

// Opens an OAuth authorization URL the way a browser would, but reads Auth's redirect
// to the consent page instead of following it, so the consent page opens on this
// server and not on the site_url's.
export async function openAuthorization(
  page: Page,
  authorizationUrl: URL,
): Promise<void> {
  const answer = await page.request.get(authorizationUrl.href, { maxRedirects: 0 });
  expect(answer.status(), "Auth redirects to the consent page").toBe(302);
  const location = answer.headers().location;
  if (location === undefined) {
    throw new Error("Auth's authorization answer has no Location");
  }
  await page.goto(onThisServer(new URL(location, authorizationUrl).href));
}
