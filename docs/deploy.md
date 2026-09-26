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

4. Open Integrations, Cron in the dashboard. Make sure the job `null-expired-raw-ips`
   is there and active. The schema adds it. Once a day it clears raw addresses whose
   retention window has closed (SPEC.md §7, issue #62). If the job is not there, the
   migration `20260925170000_null_expired_raw_ips` did not apply: read the output of
   `supabase db push`. On a self-hosted stack, pg_cron schedules jobs only in the
   database that `cron.database_name` names (`postgres` by default), so run the schema
   there.

5. Let GitHub apply later migrations. The `Deploy database` workflow
   (`.github/workflows/deploy-db.yml`) runs `supabase db push` after each green CI run
   on `main`. It needs a GitHub environment and three secrets. Follow
   [`setup/supabase.md`](setup/supabase.md), Deploy migrations from GitHub. If you skip
   this step, run `supabase db push` yourself after every push that adds a migration.

## 2. Sign-in: Google and email links

Guides: [`setup/google-oauth.md`](setup/google-oauth.md),
[`setup/email-sign-in.md`](setup/email-sign-in.md).

1. Create the OAuth client in Google Cloud with the redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In the Supabase dashboard, Authentication, Providers, Google: paste the client id and
   secret.
3. Authentication, URL Configuration: set the site URL to the deployment's origin and add
   `<origin>/auth/callback` to the redirect allow list.
4. Authentication, Providers, Email: keep the provider on for the email sign-in links
   (SPEC.md §4, D23). Keep **Confirm email** on. Without it, a stranger can make an
   account for any address with a password and sign in at once.
5. Connect a mail sender, paste the two sign-in email templates, and set the email rate
   limit. Follow [`setup/email-sign-in.md`](setup/email-sign-in.md), Production. Until
   you do, Supabase's built-in sender sends only a few emails each hour.

## 3. Application environment

Copy `.env.example` as the starting point and set these on the host:

| Variable                        | Production value                                          |
| ------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | The public origin, for example `https://porch.example`. Required: a production build refuses to start without it. |
| `NEXT_PUBLIC_SUPABASE_URL`      | From step 1.                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From step 1. Public by design.                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | From step 1. Server only. Never `NEXT_PUBLIC_`.           |
| `PORCHLIGHT_ADMIN_EMAIL`        | The email you sign in with (Google or an email link). It becomes admin on its first sign-in, and no other account does. Without it, the first profile ever is the admin, so set it before the site is reachable. |
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

1. Deploy, open the site, click "Sign in" and sign in with the `PORCHLIGHT_ADMIN_EMAIL`
   account, through Google or an email link.
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
Access section), check the two daily limits per token beside it, and pick the agent
disclosure: `footer` (the default) puts a line under every post an agent drafted, and
`off` shows nothing. If you leave agents on, read [agents.md](agents.md) so you can
answer a member who asks what their assistant may do.

## 10. Email — phase 2, issue #22

Guide: `setup/email.md`. Digest email through `EmailAccessor` (D14).
