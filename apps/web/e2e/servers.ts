// The dev servers the suite runs against, shared by playwright.config.ts and the specs
// that need the second one.

// PORT lets parallel checkouts on one machine run their own server.
export const PORT = Number(process.env.PORT ?? 3000);
// localhost, not 127.0.0.1: Next.js dev blocks cross-origin requests to its HMR endpoint.
export const BASE_URL = `http://localhost:${String(PORT)}`;

// A second server with a real Turnstile site key (#103). The main server runs with no
// key, so no page there renders the widget. This one uses Cloudflare's test key that
// always asks for a click, so its box always shows. It still loads Cloudflare's script
// from the network. The server keeps an empty secret key, so the fake provider checks
// the token on submit, as on the main server.
// TURNSTILE_PORT overrides it when the port above PORT belongs to another checkout.
export const TURNSTILE_PORT = Number(process.env.TURNSTILE_PORT ?? PORT + 1);
export const TURNSTILE_BASE_URL = `http://localhost:${String(TURNSTILE_PORT)}`;
export const TURNSTILE_FORCED_CHALLENGE_SITE_KEY = "3x00000000000000000000FF";
