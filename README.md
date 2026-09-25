# Porchlight

[![CI](https://github.com/Wintaru/porchlight/actions/workflows/ci.yml/badge.svg)](https://github.com/Wintaru/porchlight/actions/workflows/ci.yml)

A public, open-source community blog. Members and anonymous visitors share posts and
comments. An admin approves what shows. No karma, no downvotes, no leaderboards.

**Members own their content, fully, always.** One-click export. One-click erasure that
deletes, not hides. Porchlight never resells, licenses out, or trains on member content.
The MIT license covers the code only.

## Documents

- [SPEC.md](SPEC.md) — the build spec, one page per concern.
- [WAYFINDER.md](WAYFINDER.md) — the decision map. When the spec and the map disagree,
  the map wins.
- [PROPOSAL.md](PROPOSAL.md) — the original sketch, the ER diagram, and the reasoning.
- [docs/setup/](docs/setup/README.md) — one guide per external service.
- [docs/deploy.md](docs/deploy.md) — the step-by-step sequence for putting an instance
  online. Grows as issues land. Not needed for local work.

## Layout

| Path             | What lives there                                                   |
| ---------------- | ------------------------------------------------------------------ |
| `apps/web`       | Next.js App Router. The Client layer. `src/read-model/` is the only browser path to Supabase. |
| `packages/core`  | iDesign layers: Managers, Engines, Accessors, Utilities, and the composition root. |
| `packages/db`    | The typed Supabase client, generated database types, and the RLS tests. |
| `supabase`       | The local stack config, the migrations, and the seed.               |
| `docs/setup`     | Setup guides for Supabase, Google OAuth, email sign-in, Turnstile, storage, hash matching, classifiers, email. |
| `docs/deploy.md` | The ordered go-live steps that link those guides.                  |
| `design`         | Approved screen boards.                                            |

`eslint.boundaries.js` encodes the iDesign call graph. An import that crosses a layer
the wrong way fails `pnpm lint`, and `packages/core/test/boundaries.test.ts` proves the
policy still refuses each forbidden path.

### How a request moves through the core

Every operation is a typed request class that a Manager's `execute` (writes) or `query`
(reads) hands to a `HandlerResolver`. The resolver maps the request's class to one
handler file, and the handler does the work. `packages/core/src/Composition/` registers
every handler once (Manager handlers in `DependencyContainer.ts`, each accessor's handlers
in its `create*Accessor.ts`), so it is the one folder to read to learn what a request
dispatches to. `GreetingManager` and `GET/POST /api/greeting` are the worked example and
the template to copy for a real Manager: a request, a handler, an accessor interface, a
fake accessor with an env toggle, and a route handler that narrows the response with
`instanceof`.

## Run it locally

You need Node 22 or newer, [pnpm](https://pnpm.io) 11, and Docker for the Supabase
stack. No vendor keys: every external service has a fake mode.

```sh
pnpm install
cp .env.example apps/web/.env.local
supabase start        # Postgres, Auth, Storage, Realtime in Docker (docs/setup/supabase.md)
supabase db reset     # applies supabase/migrations/ and loads the seed
pnpm dev
```

The stack runs on the `583xx` ports (API `58321`, Postgres `58322`, Studio `58323`).
The seed holds four members with password `porchlight`: `lamplighter` (admin), `mira`
(moderator), `theo` (trusted) and `june` (probation). Sign in as one of them at
http://localhost:3000/auth/dev-sign-in with `<handle>@porchlight.local`. Google sign-in
needs keys and is for production (docs/setup/google-oauth.md). Email sign-in links work
locally: the emails go to Mailpit at http://127.0.0.1:58324 (docs/setup/email-sign-in.md).

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Next.js dev server on port 3000.                        |
| `supabase db reset` | Rebuilds the local database from the migrations and the seed. |
| `pnpm --filter @porchlight/db gen:types` | Regenerates `packages/db/src/database.types.ts` after a schema change. |
| `pnpm typecheck` | `tsc --noEmit` in every package.                        |
| `pnpm lint`      | ESLint (with the boundary policy) and a Prettier check. |
| `pnpm format`    | Prettier, writing.                                      |
| `pnpm test`      | Vitest in every package. `packages/db` needs the Supabase stack up. |
| `pnpm test:e2e`  | Playwright, headless. Starts its own dev server. Set `PORT` to move it. |
| `pnpm test:e2e:headed` | The real Google sign-in in a visible browser, with you at the keyboard (docs/setup/google-oauth.md). |
| `pnpm build`     | Production build of `apps/web`.                         |

Playwright needs a browser once: `pnpm --filter @porchlight/web exec playwright install chromium`.

The e2e suite runs one test at a time, with no retries, because every test shares the
one seeded database and puts back what it changed. It takes about a minute. Run
`supabase db reset` before a full run: the export-and-erase test erases the seeded
member `ivy` for real, so she is there once per seed.

## Agents

A member can mint a personal token and let their own writing assistant draft posts
through the MCP door at `/api/mcp` (SPEC.md §17). Drafts wait in the editor for a person
to read and publish. [docs/agents.md](docs/agents.md) is the guide: minting, the
`claude mcp add` line, the tools, and what an agent may never do.

## CI

`.github/workflows/ci.yml` runs the same gate on every push to `main` and every pull
request: lint, typecheck, the Vitest suites (the `packages/db` ones are the RLS tests,
so a broken policy fails the build), the production build, and the Playwright suite.
The runner starts its own Supabase stack from `supabase/config.toml`, so CI needs no
secrets. A failed Playwright run uploads its report and traces as the
`playwright-report` artifact.

## Region and the duty checklist

`/admin` picks a region (`US`, `EU`, `UK`, `CA`, `AU`, or `other`) that wires the illegal-
content reporting target, the response deadline text, and the raw-IP retention window
(SPEC.md §7). Retention itself, the audit log, and always-on scanning are global,
regardless of region. `other` shows the maximum-caution defaults and a plain warning to
check local law — these are starting defaults, not legal advice.

The same page shows a duty checklist: one row per provider that can run on its fake
(hash matching, the image classifier, Turnstile, media storage). A row reads red, "not
yet active," whenever its provider is still the fake — normal for local work, a
deliberate risk for a production deployment — and links that provider's guide under
[docs/setup/](docs/setup/README.md).

## Self-hosting

Porchlight runs anywhere Next.js and a Supabase project can: no vendor lock-in, and
every external service has a fake mode so a first deploy can go live in a degraded but
working state. [docs/deploy.md](docs/deploy.md) is the ordered, step-by-step sequence —
a hosted Supabase project, Google and email sign-in, the application environment, and each
provider guide in [docs/setup/](docs/setup/README.md) — from an empty account to a
running instance.

## License

MIT. See [LICENSE](LICENSE).
