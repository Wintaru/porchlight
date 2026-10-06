// Cloudflare Turnstile's script and site key, shared by every widget on the site
// (explicit render, use-turnstile.ts, docs/setup/turnstile.md). One `src`, so
// next/script loads it once for all of them. No site key means the fake provider runs
// (TURNSTILE_SECRET_KEY empty selects it the same way on the server).
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

// How every Turnstile box on the site looks (#103). `interaction-only` keeps the widget
// hidden unless Cloudflare needs the visitor to press it; the challenge still runs on
// every anonymous form, hidden, not removed. `compact` is 150 px wide, the only size
// that fits the sidebar subscribe card (about 270 px inside) and a nested reply form:
// `normal` is a fixed 300 px and `flexible` has a 300 px minimum.
export const TURNSTILE_APPEARANCE = "interaction-only";
export const TURNSTILE_SIZE = "compact";

export function turnstileSiteKey(): string | undefined {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return siteKey === undefined || siteKey === "" ? undefined : siteKey;
}
