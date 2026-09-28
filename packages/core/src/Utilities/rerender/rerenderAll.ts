// The re-render loop both body tables share (#94): posts and comments each page through
// every row in id order, render the Markdown again, and write the HTML only where it
// changed. Each Manager has its own table and may not call the other, so each passes
// its own steps in. The first failure stops the run and comes back as it was.
import type { StoredBody } from "../../Common/StoredBody";

// A step that could not finish. `failure` is the caller's own response, handed back.
export interface StepFailed<F> {
  readonly failure: F;
}

export interface RerenderSteps<F> {
  // The next rows after `afterId` in id order, at most `pageSize`. None left is empty.
  readonly loadPage: (
    afterId: string | null,
    pageSize: number,
  ) => Promise<readonly StoredBody[] | StepFailed<F>>;
  readonly render: (bodyMd: string) => Promise<string | StepFailed<F>>;
  // Writes the new HTML for a body whose render changed.
  readonly store: (body: StoredBody, html: string) => Promise<StepFailed<F> | undefined>;
}

export type RerenderOutcome<F> =
  | { readonly kind: "done"; readonly checked: number; readonly changed: number }
  | { readonly kind: "failed"; readonly failure: F };

// Rows read per round trip.
export const RERENDER_PAGE_SIZE = 100;

export async function rerenderAll<F>(
  steps: RerenderSteps<F>,
): Promise<RerenderOutcome<F>> {
  let checked = 0;
  let changed = 0;
  let afterId: string | null = null;
  for (;;) {
    const page = await steps.loadPage(afterId, RERENDER_PAGE_SIZE);
    if (!isPage(page)) {
      return { kind: "failed", failure: page.failure };
    }
    const last = page.at(-1);
    if (last === undefined) {
      return { kind: "done", checked, changed };
    }
    for (const body of page) {
      checked += 1;
      const html = await steps.render(body.bodyMd);
      if (typeof html !== "string") {
        return { kind: "failed", failure: html.failure };
      }
      if (html !== body.bodyHtml) {
        const failed = await steps.store(body, html);
        if (failed !== undefined) {
          return { kind: "failed", failure: failed.failure };
        }
        changed += 1;
      }
    }
    afterId = last.id;
  }
}

function isPage<F>(
  page: readonly StoredBody[] | StepFailed<F>,
): page is readonly StoredBody[] {
  return Array.isArray(page);
}
