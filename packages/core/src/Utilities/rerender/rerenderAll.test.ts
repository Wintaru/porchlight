import { describe, expect, test } from "vitest";

import type { StoredBody } from "../../Common/StoredBody";
import { RERENDER_PAGE_SIZE, rerenderAll, type RerenderSteps } from "./rerenderAll";

function bodies(count: number): StoredBody[] {
  return Array.from({ length: count }, (_, i) => {
    const id = String(i).padStart(4, "0");
    // Every third body's cached HTML is out of date.
    return { id, bodyMd: `md ${id}`, bodyHtml: i % 3 === 0 ? "old" : `<p>md ${id}</p>` };
  });
}

function stepsOver(rows: readonly StoredBody[], stored: string[]): RerenderSteps<string> {
  return {
    loadPage: (afterId, pageSize) =>
      Promise.resolve(
        rows.filter((row) => afterId === null || row.id > afterId).slice(0, pageSize),
      ),
    render: (bodyMd) => Promise.resolve(`<p>${bodyMd}</p>`),
    store: (body) => {
      stored.push(body.id);
      return Promise.resolve(undefined);
    },
  };
}

describe("rerenderAll", () => {
  test("reads every page and writes only the bodies whose HTML changed", async () => {
    const rows = bodies(RERENDER_PAGE_SIZE * 2 + 5);
    const stored: string[] = [];

    const outcome = await rerenderAll(stepsOver(rows, stored));

    const stale = rows.filter((row) => row.bodyHtml === "old").map((row) => row.id);
    expect(outcome).toEqual({
      kind: "done",
      checked: rows.length,
      changed: stale.length,
    });
    expect(stored).toEqual(stale);
  });

  test("an empty table is done with nothing checked", async () => {
    expect(await rerenderAll(stepsOver([], []))).toEqual({
      kind: "done",
      checked: 0,
      changed: 0,
    });
  });

  test("the first failure stops the run and comes back as it was", async () => {
    const rows = bodies(5);
    const stored: string[] = [];
    const steps = stepsOver(rows, stored);

    const outcome = await rerenderAll<string>({
      ...steps,
      render: (bodyMd) =>
        bodyMd === "md 0001"
          ? Promise.resolve({ failure: "render broke" })
          : steps.render(bodyMd),
    });

    expect(outcome).toEqual({ kind: "failed", failure: "render broke" });
    expect(stored).toEqual(["0000"]);
  });

  test("a failed page or store stops the run", async () => {
    const rows = bodies(5);
    const steps = stepsOver(rows, []);

    const pageFailed = await rerenderAll<string>({
      ...steps,
      loadPage: () => Promise.resolve({ failure: "load broke" }),
    });
    const storeFailed = await rerenderAll<string>({
      ...steps,
      store: () => Promise.resolve({ failure: "store broke" }),
    });

    expect(pageFailed).toEqual({ kind: "failed", failure: "load broke" });
    expect(storeFailed).toEqual({ kind: "failed", failure: "store broke" });
  });
});
