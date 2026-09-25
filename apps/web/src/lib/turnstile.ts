// Cloudflare Turnstile's script and site key, shared by the implicit widget on the root
// forms and the explicit one in reply disclosures (docs/setup/turnstile.md). One `src`,
// so next/script loads it once for both. No site key means the fake provider runs
// (TURNSTILE_SECRET_KEY empty selects it the same way on the server).
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function turnstileSiteKey(): string | undefined {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return siteKey === undefined || siteKey === "" ? undefined : siteKey;
}
