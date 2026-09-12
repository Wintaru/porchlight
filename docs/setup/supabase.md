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

The seed also holds published, unlisted, draft and pending posts, a comment thread with
a tombstone, one anonymous author with a pending post, and the default site config.
Google sign-in is not needed locally. See `google-oauth.md` for production.

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
regeneration fails `pnpm test`. `supabase db lint` checks the schema for common problems.

## Row level security

Every table has RLS on. The browser roles (`anon`, `authenticated`) hold no write
privilege on any table. Every write goes through a Manager on the server with the
service-role key (D2). The read policies:

| Table           | Public reads                                  | A signed-in member also reads     |
| --------------- | --------------------------------------------- | --------------------------------- |
| `profiles`      | active profiles, without `trust_level`        | their own profile (still without `trust_level`: the settings page reads it on the server) |
| `posts`         | `published` and `public`                      | their own posts in any status     |
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
