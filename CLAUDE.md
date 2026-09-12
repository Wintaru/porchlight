# Porchlight — instructions for Claude sessions in this repo

## What this is

Porchlight is an open-source community blog (Next.js + Supabase, iDesign layering in
`packages/core`). Read these before doing anything else, in this order:

1. `SPEC.md` — the build spec. Every rule a builder needs, one page per concern.
2. `WAYFINDER.md` — the decision map. When SPEC.md and the map disagree, the map wins.
3. `PROPOSAL.md` — the original sketch, the ER diagram, and the reasoning.
4. `design/porchlight/` — the approved screen boards (`.dc.html`). The live canvas is
   linked from WAYFINDER.md D12b.

Standing constraints from the map apply to every task: self-hostable in any region,
err on the side of caution for illegal content, everything runs locally with no vendor
keys, every screen and flow gets a Playwright test, every external service gets a
`docs/setup/` guide.

## Work tracking: GitHub issues on `Wintaru/porchlight`

Implementation work lives as issues labeled `task`, numbered in dependency order. Each
body has a `**Depends on:**` line naming the issues that must be closed first, a
`**Spec:**` line pointing at SPEC.md sections, and a `**Done when:**` line that is the
acceptance test. Labels: `phase-1`, `phase-2`, `ready`, `blocked`, `in-progress`,
`for-josh` (a manual step only Josh can do — never pick these up).

**Every `gh` command in this file carries `--repo Wintaru/porchlight`.** Never rely on
the working directory to pick the repo — a subagent or a stray `cd` can point `gh` at
another repo's issue N.

## "next issue" — the trigger phrase

When Josh says **"next issue"**, **"next"**, **"what's next"**, **"pick up the next
piece of work"**, or runs `/next-issue`, do exactly this:

1. **Sync.** `git fetch origin && git status`. If the working tree is dirty, stop and
   ask before touching anything. If HEAD is not `main`, say so and ask. If `main` is
   behind `origin/main`, `git pull --ff-only`; if that fails (local commits Josh has
   not pushed yet plus remote movement), stop and ask.
2. **List.**
   `gh issue list --repo Wintaru/porchlight --label task --state open --json number,title,labels,body --limit 100`
   - If any `task` issue carries `in-progress`, report it with the timestamp of its
     "Claimed by" comment (`gh issue view N --repo Wintaru/porchlight --json comments`)
     and ask Josh whether to take it over or leave it. Do not pick anything else until
     Josh answers.
   - Exclude `for-josh`. Exclude `phase-2` unless Josh has said phase 2 is open.
3. **Compute readiness from the body, not the label.** Parse the `**Depends on:**`
   line. Tokens: the word `nothing` means no dependency; `#N` means issue N must be
   closed with `stateReason` `COMPLETED`
   (`gh issue view N --repo Wintaru/porchlight --json state,stateReason`), a
   closed-as-not-planned dependency does not count; any other token (for example
   "phase 1 launch") means **not ready** — say what it names and ask Josh. Match `#N`
   as a whole token, so `#1` never matches `#10`. Labels can drift; the body is the
   source of truth.
4. **Pick the lowest-numbered ready issue.** Show Josh the number, title, and the
   `Done when` line in one short block, then proceed — do not wait for confirmation
   unless the issue body itself asks a question. If nothing is ready, say which issues
   are blocked and on what, and stop.
5. **Claim it, guarding against a parallel session.** Re-read
   `gh issue view N --repo Wintaru/porchlight --json labels,comments`. If `in-progress`
   is already present or a "Claimed by" comment exists, abort and go back to step 2.
   Otherwise:
   `gh issue edit N --repo Wintaru/porchlight --add-assignee @me --add-label in-progress --remove-label ready --remove-label blocked`
   then one comment: "Claimed by a Claude session on <machine> at <ISO date>." Re-read
   comments once more; if a "Claimed by" comment older than yours now exists, remove
   your label and comment and go back to step 2. Register the milestone with
   `trillian-resource session status "porchlight #N: <title>"` if that command exists.
6. **Do the work** as the issue describes, under the repo's Trillian conventions
   (`.trillian-repo.json`): small atomic commits, the verify gate, one code review of the
   body of work before the first commit message, hand-off files for anything Josh must
   do himself. Read the SPEC sections the issue cites before writing code. Load the
   `idesign` skill before touching `packages/core`. When the `Done when` line is true:
   **stage, hand Josh the commit message, and stop.** Josh runs the commit. (If Josh has
   said in the current session that Claude may commit, commit and continue to step 7.)
7. **Close it — only after the commit exists.** When Josh confirms the commit (or you
   made it with his session-level permission), comment on the issue with the commit
   hashes and a two-sentence summary, then
   `gh issue close N --repo Wintaru/porchlight --reason completed`. Then flip labels on
   dependents: for every open `task` issue whose `Depends on` line names `#N` as a
   whole token, re-run step 3 for it; if it is now ready,
   `gh issue edit M --repo Wintaru/porchlight --add-label ready --remove-label blocked`.
   Finally `gh issue edit N --repo Wintaru/porchlight --remove-label in-progress`.
8. **Stop.** Report what closed, what became ready, and the next number. Do not start
   the next issue in the same turn unless Josh says "keep going".

If a session dies mid-issue, the `in-progress` label and the claim comment stay. Step 2
surfaces it next time and Josh decides.

## Conventions that bite

SPEC.md is the source for all of these; this list is a reminder, not a second copy.

- No feature branch is needed here (`branchRequired: false`). Josh still runs every
  commit unless he says otherwise in the session. Never push. Josh pushes.
- Never add a fake provider to production config. Fakes are for local and CI only.
- A general-purpose LLM API never receives an image (SPEC.md §7).
- Scanning has no off switch. Do not add one, even behind a flag.
- Locked items and frozen evidence cannot be deleted before `retain_until`. Do not add a
  bypass, even for admins.
- Reactions never total on a profile and never sort a feed.
- Reference decisions by their map id (D7, D17) in commit bodies and issue comments when
  a change is explained by one.
- When an issue adds a production step (a key to paste, a dashboard switch, a bucket to
  create), add it to `docs/deploy.md` in the same change. Local work never needs that
  file; it is the go-live sequence Josh follows later.
