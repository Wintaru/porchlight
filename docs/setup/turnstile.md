# Cloudflare Turnstile

Every anonymous post and comment passes a Turnstile challenge before it reaches a store
(D15, SPEC.md §4). Turnstile is Cloudflare's CAPTCHA replacement: usually invisible to a
real visitor, and free. This guide sets it up for a hosted deployment and covers what
runs locally without it.

## What you do not need it for

Local work and the Playwright suite run the fake provider: an empty
`TURNSTILE_SECRET_KEY` selects it, the same rule every other `*_PROVIDER` follows
(D19), and the widget itself is skipped on the page rather than shown broken. The fake
always reports `pass` unless `TURNSTILE_FAKE_RESULT=fail` is set, which is how the
"that could not be posted" path is exercised without failing a real challenge. A
production build refuses to start with an empty `TURNSTILE_SECRET_KEY`.

One exception: the suite starts a second dev server, one port above the main one, with
Cloudflare's test site key `3x00000000000000000000FF`. That key always asks for a
click, so the box always shows, and `e2e/turnstile.spec.ts` checks that it fits the
subscribe card. That spec loads Cloudflare's script, so it needs the network. The
second server builds into `apps/web/.next/turnstile`, because Next.js allows one dev
server per build folder. The last dev server to start rewrites the gitignored
`apps/web/next-env.d.ts` to point at its own build folder. If a type-check then cannot
find `.next/turnstile` types, start either dev server once.

## Get the credentials

1. Open the Cloudflare dashboard, Turnstile, and add a site.
2. Add the deployment's hostname as the domain. Widget mode: **Managed** (Cloudflare
   decides whether to show an interactive challenge).
3. Copy the site key and the secret key.

## How the box looks

Every Turnstile box on the site uses the same two options, set once in
`apps/web/src/lib/turnstile.ts`:

- **Appearance: `interaction-only`.** The box stays hidden unless Cloudflare needs the
  visitor to press it. Most visitors see nothing. The challenge still runs on every
  anonymous form and the form still carries its `cf-turnstile-response` token. The box
  is hidden, not removed.
- **Size: `compact`** (150 px wide). The `normal` size is a fixed 300 px and `flexible`
  has a 300 px minimum. Both are wider than the sidebar subscribe card and a nested reply
  form, so only `compact` fits every place the box appears, also at phone width.

The widget mode on the dashboard stays **Managed**. These options change only how the
box looks on the page, so they need no dashboard change.

## Where the values go

**Hosted.** Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public, sent to the browser) and
`TURNSTILE_SECRET_KEY` (server only) in the deployment's environment.

**Local.** Leave both unset in `apps/web/.env.local`, the `.env.example` default. The
widget is skipped and the fake accessor answers `pass`.

## What happens on submit

1. The anonymous post, comment, report and subscribe forms render the Turnstile widget
   only when a site key is configured. Each form renders its widget explicitly when the
   form appears, also after a client-side navigation. Cloudflare's script puts a hidden
   `cf-turnstile-response` field into the widget. A reply form renders its widget when
   its disclosure first opens. The widget resets after each submit, because a token
   is good for one use only.
2. Submitting the form sends that field's token along with the rest.
3. `CreateAnonymousPostHandler`, `CreateAnonymousCommentHandler`, `FileReportHandler`
   (for a visitor) and `RequestUploadUrlAnonymouslyHandler` ask
   `AnonymousGuardEngine`, which calls Turnstile's `siteverify` endpoint with the token
   and the visitor's address before anything else in the D15 sequence — a failed or
   missing token never reaches the block list or the rate limiter.
   `SubscribeHandler` checks the token with the Turnstile accessor itself and answers
   its own "did not pass" message.
4. A failure answers the same generic "that could not be posted" message a block or a
   rate limit would (D15): a visitor cannot tell which check failed.

## Production checklist

- Set both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` before opening
  anonymous posting (`site_config.posting` or `comments` set to `anyone`). The build
  refuses an empty secret key in production, but posting could still be `staff`-only
  and never need it.
- Set `EVIDENCE_IP_HASH_SALT` to a strong, generated value and never rotate it — the
  block list and rate limiter key on the salted hash, and rotating it un-matches every
  existing block (SPEC.md §7).
- Put a reverse proxy in front (nginx, Caddy, Cloudflare, or the platform's own edge)
  that overwrites or strips any `X-Forwarded-For` a client sends before appending its
  own view of the connection, then set `TRUST_FORWARDED_FOR=true`. Without a proxy
  that owns this header, leave it unset: the app cannot tell a real address from one a
  visitor made up, and trusting it anyway would let a flood present a fresh identity on
  every anonymous submit and skip the IP block list and the per-IP rate limit
  entirely. Left unset, every anonymous visitor shares one bucket instead — the guard
  degrades, it does not fail open.
