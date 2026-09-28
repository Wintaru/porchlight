// The re-render loop both body tables share (#94): posts and comments each page through
// their rows in id order, render the Markdown again, and write the HTML only where it
// changed. Each Manager has its own table and may not call the other, so each passes
// its own steps in. The first failure stops the run and comes back as it was.
//
// One run reads at most `maxBodies` rows after `afterId`, so a large site never needs
// one request longer than the host allows (#98, C24). A run that used its budget comes
// back "stopped" with the id to resume after; the cursor is the caller's to keep.
import type { StoredBody } from "../../Common/StoredBody";
import { isUuid } from "../../Common/Uuid";

// A step that could not finish. `failure` is the caller's own response, handed back.
export interface StepFailed<F> {
  readonly failure: F;
}

// What a store did: "written", or "skipped" when the body was saved (or removed) after
// it was read, so the save's own HTML stays.
export type StoreResult = "written" | "skipped";

export interface RerenderSteps<F> {
  // The next rows after `afterId` in id order, at most `pageSize`. None left is empty.
  readonly loadPage: (
    afterId: string | null,
    pageSize: number,
  ) => Promise<readonly StoredBody[] | StepFailed<F>>;
  readonly render: (bodyMd: string) => Promise<string | StepFailed<F>>;
  // Writes the new HTML for a body whose render changed.
  readonly store: (
    body: StoredBody,
    html: string,
  ) => Promise<StoreResult | StepFailed<F>>;
}

// Where a run starts, and how many rows it may read.
export interface RerenderRange {
  readonly afterId: string | null;
  readonly maxBodies: number;
}

export interface RerenderCounts {
  // Rows read and rendered.
  readonly checked: number;
  // Rows written with new HTML.
  readonly changed: number;
  // Rows whose HTML changed but that were saved during the run, so not written.
  readonly skipped: number;
}

export type RerenderOutcome<F> =
  | ({ readonly kind: "done" } & RerenderCounts)
  | ({ readonly kind: "stopped"; readonly resumeAfterId: string } & RerenderCounts)
  | { readonly kind: "failed"; readonly failure: F };

// Rows read per round trip.
export const RERENDER_PAGE_SIZE = 100;

// The cursor comes from a form or an address, so a handler checks it before it reaches
// a query: a row id or none, and a whole budget of at least one row.
export function isRerenderRange(range: RerenderRange): boolean {
  return (range.afterId === null || isUuid(range.afterId)) && isBudget(range.maxBodies);
}

function isBudget(maxBodies: number): boolean {
  return Number.isSafeInteger(maxBodies) && maxBodies >= 1;
}

export async function rerenderAll<F>(
  steps: RerenderSteps<F>,
  range: RerenderRange,
): Promise<RerenderOutcome<F>> {
  // The handlers refuse a bad range with a response first (isRerenderRange). Here a bad
  // budget is a programming error, and a limit of 0 or less must never reach a query.
  if (!isBudget(range.maxBodies)) {
    throw new Error("rerenderAll: the budget was not checked");
  }
  let checked = 0;
  let changed = 0;
  let skipped = 0;
  let afterId = range.afterId;
  for (;;) {
    const room = range.maxBodies - checked;
    const page = await steps.loadPage(afterId, Math.min(RERENDER_PAGE_SIZE, room));
    if (!isPage(page)) {
      return { kind: "failed", failure: page.failure };
    }
    const last = page.at(-1);
    if (last === undefined) {
      return { kind: "done", checked, changed, skipped };
    }
    for (const body of page) {
      checked += 1;
      const html = await steps.render(body.bodyMd);
      if (typeof html !== "string") {
        return { kind: "failed", failure: html.failure };
      }
      if (html !== body.bodyHtml) {
        const stored = await steps.store(body, html);
        if (typeof stored !== "string") {
          return { kind: "failed", failure: stored.failure };
        }
        if (stored === "written") {
          changed += 1;
        } else {
          skipped += 1;
        }
      }
    }
    afterId = last.id;
    // The budget is used up. A full last page may have been the last of the table, and
    // the next press then finds nothing and reports done.
    if (checked >= range.maxBodies) {
      return { kind: "stopped", resumeAfterId: afterId, checked, changed, skipped };
    }
  }
}

function isPage<F>(
  page: readonly StoredBody[] | StepFailed<F>,
): page is readonly StoredBody[] {
  return Array.isArray(page);
}
