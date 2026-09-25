# Deploy Porchlight

The step-by-step sequence for putting a Porchlight instance online. Nothing here is
needed for local work: `README.md` covers that, and every external service has a fake
mode. This file grows as issues land. **When an issue adds a production step, it adds
that step here in the same change.** Steps marked "issue #N" are placeholders for work
that has not landed yet.

Each step links the setup guide for its service under [`setup/`](setup/README.md). The
guide says what the service is for and how to get credentials; this file says the order.

## 1. Hosted Supabase project

Guide: [`setup/supabase.md`](setup/supabase.md).

1. Create a project at https://supabase.com/dashboard. Pick the region you plan to
   operate in — you set the same region from `/admin` after first sign-in, step 8.
2. Open Project Settings, API. Copy the project URL, the anon key and the service-role
   key. They become `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` in the deployment's environment.
3. From the repo root, link the project and apply the schema:

   ```sh
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Do not load `supabase/seed.sql` on a hosted project. It holds local test members.

## 2. Google sign-in

Guide: [`setup/google-oauth.md`](setup/google-oauth.md).

1. Create the OAuth client in Google Cloud with the redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In the Supabase dashboard, Authentication, Providers, Google: paste the client id and
   secret.
3. Authentication, URL Configuration: set the site URL to the deployment's origin and add
   `<origin>/auth/callback` to the redirect allow list.
4. Authentication, Providers, Email: disable email and password sign-in. Google is the
   only production path (SPEC.md §4).

## 3. Application environment

Copy `.env.example` as the starting point and set these on the host:

| Variable                        | Production value                                          |
| ------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | The public origin, for example `https://porch.example`. Required: a production build refuses to start without it. |
| `NEXT_PUBLIC_SUPABASE_URL`      | From step 1.                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From step 1. Public by design.                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | From step 1. Server only. Never `NEXT_PUBLIC_`.           |
| `PORCHLIGHT_ADMIN_EMAIL`        | Your Google account's email. It becomes admin on its first sign-in. Without it, the first profile ever is the admin. |
| `AUTH_DEV_SIGN_IN`              | Leave unset. A production build ignores it, but it should not be there. |
| `PROFILE_PROVIDER`              | Leave unset (`supabase`). `fake` is refused in production. |
| `POST_PROVIDER`, `COMMENT_PROVIDER`, `REACTION_PROVIDER`, `SITE_CONFIG_PROVIDER` | Leave unset (`supabase`). `fake` is refused in production. |
| `ANONYMOUS_AUTHOR_PROVIDER`, `BLOCK_PROVIDER`, `RATE_LIMIT_PROVIDER` | Leave unset (`supabase`). `fake` is refused in production. Behind the D15 anonymous guard (issue #8). |
| `EVIDENCE_IP_HASH_SALT`         | Required to admit any anonymous write. Generate once, never rotate — see `setup/turnstile.md`. |
| `ANONYMOUS_LIMIT_PER_IP_PER_HOUR`, `ANONYMOUS_LIMIT_PER_TOKEN_PER_HOUR` | Optional. Defaults: 30 and 15. |
| `TRUST_FORWARDED_FOR`           | `true` only behind a reverse proxy that owns `X-Forwarded-For` (see `setup/turnstile.md`). Leave unset otherwise — every anonymous visitor then shares one IP bucket instead of the block list and rate limit being spoofable, and a moderator's block reaches the writer's cookie only, never an address. |
| `GREETING_PROVIDER`             | Leave unset. The greeting example has no production provider. |
| `ALLOW_FAKE_PROVIDERS`          | Leave unset. Setting it to `1` lifts the production refusal on a `*_PROVIDER=fake` (hash matching, the image classifier, Turnstile, media storage) for a deliberate degraded launch — the admin checklist (`/admin`) then shows that provider red, "not yet active" (issue #12). |

Every other variable in `.env.example` belongs to a service whose production setup is a
later step below. Region and every other D20 setting are not environment variables —
step 8 sets them from the admin settings page after first sign-in.

## 4. First sign-in

1. Deploy, open the site, click "Sign in with Google" with the `PORCHLIGHT_ADMIN_EMAIL`
   account.
2. Open `/settings` and confirm the role line reads `Role: admin.` Pick your handle.

## 5. Cloudflare Turnstile

Guide: [`setup/turnstile.md`](setup/turnstile.md). Guards every anonymous submit
(D15). Needed before opening `posting` or `comments` to `anyone` (step 3's table has
the rest of the anonymous-guard variables).

## 6. Storage buckets

Guide: [`setup/storage.md`](setup/storage.md). The quarantine and public buckets
behind `MediaStorageAccessor` (D4) are created by a migration; no dashboard step.

## 7. Hash matching and classifiers

Guides: `setup/hash-matching.md`, `setup/classifiers.md`. Until Shield access is
approved (D17b) the fake hash provider runs and the admin checklist (step 8) shows
"hash matching: not yet active".

## 8. Site settings: region, identity, and the duty checklist

Open `/admin` (admin only). Set `site_name`, `site_tagline` and `about_md`; pick the
region, which fills the reporting target, deadline text and the raw-IP retention
window `EvidenceAccessor` uses (issue #10) — review and adjust the retention value,
since the filled-in number is a starting point, not legal advice. Pick a setup preset
("Just me", "Friends" or "Open porch") or set `posting`, `comments` and `sign_up`
individually. The duty checklist on the same page shows red, "not yet active", for
any of hash matching, the image classifier, Turnstile or media storage still running
its fake — each row links its setup guide. Every value here can change again later
from the same page.

## 9. Agents — no production step

The MCP door at `/api/mcp` needs no key and no external service: a member mints their
own token on the settings page. Decide whether to leave `agents` on (`/admin`, the
Access section) and, if you leave it on, read [agents.md](agents.md) so you can answer
a member who asks what their assistant may do.

## 10. Email — phase 2, issue #22

Guide: `setup/email.md`. Digest email through `EmailAccessor` (D14).
