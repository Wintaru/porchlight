---
description: Find the next ready Porchlight issue on GitHub, claim it, and start work.
---

Run the "next issue" procedure from the repo's `CLAUDE.md`, step by step, starting with
the sync. Compute readiness from each issue's `**Depends on:**` line, not from labels.
Pick the lowest-numbered ready `task` issue that is not `for-josh`, `in-progress`, or
`phase-2`. Show the number, title, and `Done when` line, claim it, and begin.

If the user passed an argument, treat it as an issue number: skip the search, but still
run step 1 (sync), the step 2 exclusions (`for-josh`, `in-progress`, `phase-2`), and
step 3 (readiness) on that one issue. If it fails any check, say which and stop. Argument:
$ARGUMENTS
