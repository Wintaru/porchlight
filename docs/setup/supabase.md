# Supabase

Supabase gives Porchlight its Postgres database, sign-in (Auth), file storage and the
Realtime channel behind the notification bell. Locally, all of it runs in Docker from
the Supabase CLI. No account and no keys are needed for local work.

## What you need

- Docker (Docker Desktop, OrbStack, or any engine the CLI can reach).
- The Supabase CLI, 2.x: https://supabase.com/docs/guides/local-development/cli/getting-started

## Start the local stack

Run from the repo root:

```sh
supabase start      # first run downloads the images, later runs take seconds
supabase db reset   # applies supabase/migrations/ and loads supabase/seed.sql
```

`supabase start` prints the URLs and keys. The local keys are the same on every machine
and are already in `.env.example`, so a fresh clone runs with no edits. Copy it once:

```sh
cp .env.example apps/web/.env.local
```

| Service  | Local address           |
| -------- | ----------------------- |
| API      | http://127.0.0.1:58321  |
| Postgres | 127.0.0.1:58322         |
| Studio   | http://127.0.0.1:58323  |
| Mail     | http://127.0.0.1:58324  |

Porchlight uses the `583xx` port block instead of the CLI default `543xx`, so it can run
next to another Supabase project on the same machine. The block is set in
`supabase/config.toml`. To move it, change every `port` there and the three Supabase
addresses in `.env.example`. The `packages/db` tests read `.env.example` for the same
values, so nothing else needs an edit.

`supabase stop` shuts the stack down and keeps the data. `supabase db reset` wipes it.

## Seed members

`supabase db reset` loads four members with password `porchlight`:

| Handle        | Email                         | Role      | Trust     |
| ------------- | ----------------------------- | --------- | --------- |
| `lamplighter` | lamplighter@porchlight.local  | admin     | trusted   |
| `mira`        | mira@porchlight.local         | moderator | trusted   |
| `theo`        | theo@porchlight.local         | member    | trusted   |
| `june`        | june@porchlight.local         | member    | probation |

A fifth profile, `wren`, is erased (no sign-in, blank fields): `/@wren` answers 410 Gone.

The seed also holds published, unlisted, draft and pending posts, a comment thread with
a tombstone, one anonymous author with a pending post, and the default site config.
Google sign-in is not needed locally: open `/auth/dev-sign-in` in the running app and
sign in as one of these members. See `google-oauth.md` for production.

## Schema and migrations

The schema lives in `supabase/migrations/`, one file per concern, applied in name order.
Every fixed value set (post status, role, scan status, ...) is a Postgres enum, and the
generated file `packages/db/src/database.types.ts` turns each enum into a string-literal
union for application code.

After a schema change:

```sh
supabase db reset                              # apply from scratch and re-seed
pnpm --filter @porchlight/db gen:types         # regenerate the types
pnpm --filter @porchlight/db test              # RLS, constraints, and the types guard
```

The types test compares the committed file with a fresh `gen types` run, so a forgotten
regeneration fails `pnpm test`. CI pins the CLI to the version in
`.github/workflows/ci.yml` (`supabase/setup-cli`). Regenerate with that same version, or
a CLI that formats the output differently fails the test in CI and not on your machine.
`supabase db lint` checks the schema for common problems.

## Row level security

Every table has RLS on. The browser roles (`anon`, `authenticated`) hold no write
privilege on any table. Every write goes through a Manager on the server with the
service-role key (D2). The read policies:

| Table           | Public reads                                  | A signed-in member also reads     |
| --------------- | --------------------------------------------- | --------------------------------- |
| `profiles`      | active profiles, and erased ones (only `handle` and `status` are left on those, so `/@handle` can answer 410), without `trust_level` | their own profile (still without `trust_level`: the settings page reads it on the server) |
| `posts`         | `published`, unlisted included: an unlisted post is readable by link and the read-model keeps it out of every list | their own posts in any status     |
| `comments`      | `visible` and `tombstone`, on a visible post  | their own comments in any status  |
| `tags`          | all                                           |                                   |
| `post_tags`     | tags of a visible post                        |                                   |
| `reactions`     | reactions on a visible item                   |                                   |
| `media_assets`  | approved copies only, without the quarantine path, original filename or hashes | their own uploads, unless locked |
| `notifications` | none                                          | their own rows                    |

Everything else (`anonymous_authors`, `submission_evidence`, `reports`, `mod_actions`,
`audit_log`, `quotas`, `rate_limits`, `blocks`, `site_config`) is server-only.

`packages/db/test/rls.test.ts` runs each policy as the browser role would and fails when a
new table appears without RLS or with a write privilege.

One SQL function, `replace_post_tags`, sets a post's tags in a single transaction. It is
server-only like every write: the browser roles cannot execute it, and the same test
checks that.

## Keys and where they go

| Variable                        | Value locally                        | Notes                                       |
| ------------------------------- | ------------------------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `http://127.0.0.1:58321`             | Public. The browser uses it.                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | printed by `supabase start`          | Public by design. RLS is the wall.          |
| `SUPABASE_SERVICE_ROLE_KEY`     | printed by `supabase start`          | Bypasses RLS. Server only. Never `NEXT_PUBLIC_`. |
| `DATABASE_URL`                  | `postgresql://postgres:postgres@127.0.0.1:58322/postgres` | Migrations, seed, and the db tests. |

For a hosted project, create one at https://supabase.com/dashboard, open Project
Settings, API, and paste the URL and the two keys into the deployment's environment.
Apply the migrations with `supabase db push` after `supabase link`. See
https://supabase.com/docs/guides/deployment/database-migrations.

## Deploy migrations from GitHub

The `push-migrations` job in `.github/workflows/ci.yml` applies new migrations to the
hosted project. It runs on each push to `main`, after the `verify` job passes. It applies
only the migrations the project does not have yet. It never loads the seed.

To turn the job on:

1. Make a personal access token at https://supabase.com/dashboard/account/tokens. The
   token can change every project on your Supabase account, not only this one. If the
   account holds other projects, think about a separate account for Porchlight.
2. In the GitHub repository, open Settings, Environments. Make an environment named
   `production`.
3. Under Deployment branches and tags, select Selected branches and tags. Add `main`.
   A workflow edited on another branch then cannot read the secrets.
4. Add three environment secrets:

   | Secret                  | Value                                               |
   | ----------------------- | --------------------------------------------------- |
   | `SUPABASE_ACCESS_TOKEN` | the token from step 1                               |
   | `SUPABASE_DB_PASSWORD`  | the database password you set when you made the project |
   | `SUPABASE_PROJECT_REF`  | the project ref only, not a URL: the 20-character id in `https://<ref>.supabase.co` |

5. Push to `main`, or open Actions, CI, and re-run the last run on `main`. When `verify`
   passes, `push-migrations` starts. Read its `supabase db push` step. With no new
   migrations, it says the remote database is up to date.

Until the secrets exist, the job fails at `supabase link`. The app deploy does not
change.

### Release the app after the migrations

The app and the database deploy separately. Many hosts deploy the app when you push and
do not wait for CI. Then new code can run on the old schema for a short time. If CI
fails, the migration does not apply until a later CI run passes, but the app is already
live.

On Vercel, make the release wait for both jobs:

1. Open the project's Settings, Environments, Production. Make sure automatic aliasing
   for production is on.
2. Open Settings, Build and Deployment, Deployment Checks. Select Add Checks, then
   GitHub.
3. Add the checks `verify` and `push-migrations`.

Vercel still builds each push at once. It gives the build the production domain only
when both checks pass on that commit, so the schema is in place first. A build whose CI
fails or stops never goes live. The next push that passes releases its code too. To
release a held build by hand, use Force Promote on its deployment page. The check names
are the job names, so if you rename a job, change the check too.

Force Promote and a rollback to an older build still put code next to a schema it was
not tested with. So write each migration so that the code already in production still
works with it, even with the checks on.
