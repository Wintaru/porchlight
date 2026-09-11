# Porchlight

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

## Layout

| Path             | What lives there                                                   |
| ---------------- | ------------------------------------------------------------------ |
| `apps/web`       | Next.js App Router. The Client layer. `src/read-model/` is the only browser path to Supabase. |
| `packages/core`  | iDesign layers: Managers, Engines, Accessors, Utilities, and the composition root. |
| `packages/db`    | Supabase clients and generated database types.                      |
| `docs/setup`     | Setup guides for Supabase, Google OAuth, Turnstile, storage, hash matching, classifiers, email. |
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
pnpm dev
```

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Next.js dev server on port 3000.                        |
| `pnpm typecheck` | `tsc --noEmit` in every package.                        |
| `pnpm lint`      | ESLint (with the boundary policy) and a Prettier check. |
| `pnpm format`    | Prettier, writing.                                      |
| `pnpm test`      | Vitest in every package.                                |
| `pnpm test:e2e`  | Playwright. Starts its own dev server. Set `PORT` to move it. |
| `pnpm build`     | Production build of `apps/web`.                         |

Playwright needs a browser once: `pnpm --filter @porchlight/web exec playwright install chromium`.

## License

MIT. See [LICENSE](LICENSE).
