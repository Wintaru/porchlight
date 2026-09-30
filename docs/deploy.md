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

4. Open Integrations, Cron in the dashboard. Make sure the jobs `null-expired-raw-ips`
   and `sweep-rate-limits` are there and active. The schema adds both, so there is
   nothing to turn on. Once a day the first clears raw addresses whose retention window
   has closed (SPEC.md §7, issue #62). Once an hour the second deletes rate-limit
   counters older than two days (issue #43). If a job is not there, its migration
   (`20260925170000_null_expired_raw_ips` or `20260927030000_sweep_rate_limits`) did
   not apply: read the output of `supabase db push`. On a self-hosted stack, pg_cron
   schedules jobs only in the database that `cron.database_name` names (`postgres` by
   default), so run the schema there.

5. Let GitHub apply later migrations. The `push-migrations` job in
   `.github/workflows/ci.yml` runs `supabase db push` after the `verify` job passes on
   `main`. It needs a GitHub environment and three secrets. Follow
   [`setup/supabase.md`](setup/supabase.md), Deploy migrations from GitHub. If you skip
   this step, run `supabase db push` yourself after every push that adds a migration.
   On Vercel, also add the Deployment Checks `verify` and `push-migrations`, from the
   same section, so the app goes live only after the schema is in place.

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
| `MEMBER_BLOCK_PROVIDER`, `FOLLOW_PROVIDER`, `TAG_PROVIDER` | Leave unset (`supabase`). `fake` is refused in production. Member mutes and blocks (issue #23), follows and tag descriptions (issue #24). |
| `EMAIL_PREFERENCE_PROVIDER`, `SUBSCRIBER_PROVIDER` | Leave unset (`supabase`). `fake` is refused in production. Member email settings, reader subscriptions and the digest sweep (issue #22). |
| `INVITE_PROVIDER`               | Leave unset (`supabase`). `fake` is refused in production. Invite links (issue #25). |
| `PRESENCE_PROVIDER`             | Leave unset (`supabase`). `fake` is refused in production. Who is online and typing, sent by the server (issue #81). |
| `ANONYMOUS_AUTHOR_PROVIDER`, `BLOCK_PROVIDER`, `RATE_LIMIT_PROVIDER` | Leave unset (`supabase`). `fake` is refused in production. Behind the D15 anonymous guard (issue #8). |
| `EVIDENCE_IP_HASH_SALT`         | Required to admit any anonymous write. Generate once, never rotate — see `setup/turnstile.md`. |
| `ANONYMOUS_LIMIT_PER_IP_PER_HOUR`, `ANONYMOUS_LIMIT_PER_TOKEN_PER_HOUR` | Optional. Defaults: 30 and 15. |
| `TRUST_FORWARDED_FOR`           | `true` only behind a reverse proxy that owns `X-Forwarded-For` (see `setup/turnstile.md`). Leave unset otherwise — every anonymous visitor then shares one IP bucket instead of the block list and rate limit being spoofable, and a moderator's block reaches the writer's cookie only, never an address. |
| `ALLOW_FAKE_PROVIDERS`          | Leave unset. Setting it to `1` lifts the production refusal on a `*_PROVIDER=fake` (hash matching, the image classifier, Turnstile, media storage) for a deliberate degraded launch — the admin checklist (`/admin`) then shows that provider red, "not yet active" (issue #12). It also lets videos through the image classifier with a fake "clear" while no provider scans video (hash matching still runs); without it every video upload is refused. |

The host must run Next.js `after()`: the subscribe form and closed-site sign-in send
their email after the response (issue #84). Vercel and `next start` do. A host that
stops the function when the response ends drops that email.

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
behind `MediaStorageAccessor` (D4) are created by a migration.

For video (D4b) the project must be on the Pro plan:

1. In the dashboard, open Storage, Settings. Set "Upload file size limit" to at least
   500 MB, then save.
2. Open `/admin`. In the attachment allowlist, check that `heic` and `mp4` are ticked.
   The migration adds both to a saved list.
3. Check the byte caps for trusted members. A video can be 250 MiB, so the account cap
   must be larger. The default is 2 GiB. A list saved before video has the old 200 MB
   cap: raise it.

## 7. Hash matching and classifiers

Guides: `setup/hash-matching.md`, `setup/classifiers.md`. Until Shield access is
approved (D17b) the fake hash provider runs and the admin checklist (step 8) shows
"hash matching: not yet active".

When Shield approves access, set `HASH_MATCH_PROVIDER`, `HASH_MATCH_API_KEY` and
`ARACHNID_VERIFICATION_TOKEN` (the domain check token), redeploy, and confirm
`/robots.txt` shows the `ProjectArachnid/` line before you run the domain check.

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

## 9. Agents

Guide: [`setup/mcp-oauth.md`](setup/mcp-oauth.md).

The MCP door at `/api/mcp` needs no key: a member mints their own token on the settings
page. Decide whether to leave `agents` on (`/admin`, the Access section), check the two
daily limits per token beside it, and pick the agent disclosure: `footer` (the default)
puts a line under every post an agent drafted, and `off` shows nothing. If you leave
agents on, read [agents.md](agents.md) so you can answer a member who asks what their
assistant may do.

To let members connect claude.ai as a custom connector (issue #79, D25), turn on
Supabase Auth's OAuth server:

1. In the Supabase dashboard, open Authentication, **OAuth Server**. Turn on the OAuth
   2.1 server.
2. Set the authorization path to `/oauth/consent`.
3. Turn on **Allow dynamic client registration**.
4. Check that the site's metadata names Auth's issuer. Follow
   [`setup/mcp-oauth.md`](setup/mcp-oauth.md), Production, step 4.
5. Check that Auth signs tokens with an ES256 key. The door refuses every other kind
   (issue #88). Follow [`setup/mcp-oauth.md`](setup/mcp-oauth.md), Production, step 5.
6. After the deploy, connect claude.ai by hand once. Follow
   [`setup/mcp-oauth.md`](setup/mcp-oauth.md), Connect claude.ai by hand after deploy.
   No automated test does this against the deployed site.

Skip these steps and `plt_` tokens still work. Only OAuth connectors do not.

## 10. Email — digests and the moderation queue (issue #22)

Guide: [`setup/email.md`](setup/email.md). Without these steps the site sends no email,
and Settings says so. Nothing else breaks.

1. Verify a sending domain at Resend and create an API key. Follow
   [`setup/email.md`](setup/email.md), Get the credentials.
2. Set these on the host, then redeploy:

   | Variable         | Production value                                                  |
   | ---------------- | ----------------------------------------------------------------- |
   | `EMAIL_PROVIDER` | `resend`                                                          |
   | `EMAIL_API_KEY`  | The Resend API key.                                               |
   | `EMAIL_FROM`     | An address on the verified domain, for example `Porchlight <mail@blog.example.com>`. |
   | `CRON_SECRET`    | A long random string, for example the output of `openssl rand -hex 32`. |

3. Make a scheduler call the sweep every five minutes. Supabase can do it on any plan.
   In the Supabase dashboard, open Database, then Extensions, and turn on `pg_net`.
   `pg_cron` is on already (section 1, step 4). Then run this in the SQL editor, with your secret
   and your site's address:

   ```sql
   select vault.create_secret('<CRON_SECRET>', 'porchlight_cron_secret');

   select cron.schedule(
     'porchlight-email-sweep',
     '*/5 * * * *',
     $$
     select net.http_post(
       url := 'https://blog.example.com/api/email/digest',
       body := '{}'::jsonb,
       timeout_milliseconds := 60000,
       headers := jsonb_build_object(
         'Authorization',
         'Bearer ' || (
           select decrypted_secret from vault.decrypted_secrets
           where name = 'porchlight_cron_secret'
         )
       )
     );
     $$
   );
   ```

   A run can take up to 60 seconds, because it waits between calls to Resend (issue
   #86). Keep `timeout_milliseconds` at 60000 or more. The route asks the host for 60
   seconds, which every Vercel plan allows.

   Any other scheduler works too: it sends `POST` (or `GET`) to `/api/email/digest` with
   the header `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends that header on its
   own, but the Hobby plan runs a job at most once a day, which is too slow for hourly
   digests.
4. Check it. Turn on an hourly digest in Settings. In the Supabase SQL editor,
   `select status_code, content from net._http_response order by created desc limit 5;`
   shows what the route answered: `200` and a count of emails sent. The Resend dashboard
   shows each email.

## 11. After an update that changes how posts render

Posts and comments keep the HTML made when they were saved. After an update that
changes the render, such as code colours (issue #77) or video links (issue #21), open
`/admin`, go to
Maintenance, and press **Re-render posts and comments** once. It is safe to press
again: a body that is already current is left as it is. A post it changes gets a new
"last updated" time, which the sitemap shows.

One press renders about a thousand posts and comments (issue #98,
`RERENDER_BODIES_PER_PRESS`). On a larger site the page shows "Stopped part way" and a
**Continue** button. Press Continue until the page shows "Re-rendered". The counts are
for each press. "Skipped" counts a body that someone
saved during the run: the save already wrote the new HTML.

## 12. Realtime: private channels only (issue #89)

Porchlight uses only private Realtime channels: presence, and the notification bell.
With public access on, anyone who has the anon key can join a public channel and send
on it, and use your Realtime quota. Switch public access off.

1. Deploy the release that makes the bell private first. Its migration
   (`20260928050000_notifications_private_channel`) must be in the hosted database.
   Before that release, the bell uses a public channel, and this switch stops it.
2. In the dashboard, open Realtime, Settings. Switch off **Allow public access**.
3. Check the bell. Sign in as one member and keep a page open. As a second member,
   reply to a comment of the first member (or approve a held reply to it). The bell of
   the first member must light up with no reload. If it does not, switch public access
   on again and open an issue.

Watch the cost of presence after launch. Each open page calls `/api/presence` about 3
times a minute. In the Vercel dashboard, open Usage and look at the function
invocations for `/api/presence`. If the count is too high, a later release can make
the interval longer (decision C8 in issue #89 kept it at 20 seconds).

## 13. Held uploads in the queue (issue #90)

No switch to change. The migration `20260928060000_upload_gaps` goes out with the
release, like any other.

After the deploy, open `/mod/queue` and choose **Flagged**. A held upload that is not
the cover of a waiting post is now a queue item. Held uploads from before this release
show there too. Approve each one as mature, or reject it with a reason. Only a photo can
be approved as mature, because a mature file can only be a cover.

## 14. Invite links: one rule, and no empty accounts (issue #92)

No switch to change. The migration `20260928070000_invite_is_live` goes out with the
release, like any other.

After the deploy, a refused first sign-in deletes the auth user that Supabase Auth made
for it. This is an invite email opened in another browser, or a Google sign-in on a
closed site. Empty accounts from before this release stay. To see them, run this in the
SQL editor. It only reads.

```sql
select u.id, u.email, u.created_at
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
order by u.created_at;
```

Some of these are people who asked for an email link and did not open it yet. Delete an
old one in the dashboard (Authentication, Users) only when you are sure it is not a
member.

## 15. Faster lists and search (issue #93)

No switch to change. Three migrations go out with the release, like any other:
`20260928080000_author_post_indexes`, `20260928081000_listed_post_ids` and
`20260928082000_search_newest_matches`.

The first migration builds two indexes on `posts`. While it runs, nobody can save a
post. On a site with a few thousand posts this takes less than a second. On a much
larger site, deploy at a quiet time.

## 16. One source for shared rules (issue #94)

No switch to change. The migration `20260928090000_one_source_rules` goes out with the
release, like any other. It adds two small helper functions and changes the two email
claim functions to use them. The emails do not change.

One change that a person can see: an agent's `create_draft` and `update_draft` now
refuse a body longer than 100,000 characters, the same limit as the editor. Before,
the tools took a body of any length.

## 17. Private posts (issue #101)

No switch to change. Two migrations go out with the release, like any other, in this
order: `20260928130000_post_visibility_private` and `20260928131000_private_posts`. The
first adds the value `private` to the post visibility list. The second uses it, so
they must stay two files: Postgres cannot use a new list value in the transaction that
adds it.

The second migration adds two checks to `posts`. Postgres reads every post once to
test them. On a site with a few thousand posts this takes less than a second.

Deploy the migrations before the app, as the `push-migrations` job does. An app that
arrives first offers "Private" in the editor, and the database refuses the save until
the migrations are in.

## 18. Traffic watch

The `traffic-watch` workflow counts the last hour of production requests every hour.
When the count is above the limit, it opens one issue with the `traffic` label and the
ten busiest paths. While that issue is open, each new spike adds a comment to it. Close
the issue when the spike is explained. The Hobby plan keeps request logs for one hour
only, so the workflow cannot read further back.

The workflow does nothing until you give it a Vercel token:

1. In Vercel, open **Account Settings → Tokens** and make a token with the team scope.
2. In GitHub, add it as the repository secret `VERCEL_TOKEN`.
3. Add the repository variable `VERCEL_SCOPE` with the team id, for example
   `josh-donners-projects` (`vercel teams ls` shows it).
4. Optional: add the variable `TRAFFIC_ALERT_PER_HOUR`. The default is 500.
5. Create the `traffic` label, then run the workflow once from the **Actions** tab to
   see the count in its summary.
