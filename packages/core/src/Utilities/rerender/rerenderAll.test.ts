import { describe, expect, test } from "vitest";

import type { StoredBody } from "../../Common/StoredBody";
import {
  isRerenderRange,
  RERENDER_PAGE_SIZE,
  rerenderAll,
  type RerenderSteps,
} from "./rerenderAll";

const WHOLE_TABLE = { afterId: null, maxBodies: Number.MAX_SAFE_INTEGER };

function bodies(count: number): StoredBody[] {
  return Array.from({ length: count }, (_, i) => {
    const id = String(i).padStart(4, "0");
    // Every third body's cached HTML is out of date.
    return { id, bodyMd: `md ${id}`, bodyHtml: i % 3 === 0 ? "old" : `<p>md ${id}</p>` };
  });
}

function stepsOver(
  rows: readonly StoredBody[],
  stored: string[],
  limits: number[] = [],
): RerenderSteps<string> {
  return {
    loadPage: (afterId, pageSize) => {
      limits.push(pageSize);
      return Promise.resolve(
        rows.filter((row) => afterId === null || row.id > afterId).slice(0, pageSize),
      );
    },
    render: (bodyMd) => Promise.resolve(`<p>${bodyMd}</p>`),
    store: (body) => {
      stored.push(body.id);
      return Promise.resolve("written");
    },
  };
}

describe("rerenderAll", () => {
  test("reads every page and writes only the bodies whose HTML changed", async () => {
    const rows = bodies(RERENDER_PAGE_SIZE * 2 + 5);
    const stored: string[] = [];

    const outcome = await rerenderAll(stepsOver(rows, stored), WHOLE_TABLE);

    const stale = rows.filter((row) => row.bodyHtml === "old").map((row) => row.id);
    expect(outcome).toEqual({
      kind: "done",
      checked: rows.length,
      changed: stale.length,
      skipped: 0,
    });
    expect(stored).toEqual(stale);
  });

  test("an empty table is done with nothing checked", async () => {
    expect(await rerenderAll(stepsOver([], []), WHOLE_TABLE)).toEqual({
      kind: "done",
      checked: 0,
      changed: 0,
      skipped: 0,
    });
  });

  test("a run stops at its budget and the next resumes where it stopped (#98)", async () => {
    const rows = bodies(10);
    const stored: string[] = [];
    const limits: number[] = [];
    const steps = stepsOver(rows, stored, limits);

    const first = await rerenderAll(steps, { afterId: null, maxBodies: 4 });
    expect(first).toEqual({
      kind: "stopped",
      resumeAfterId: "0003",
      checked: 4,
      changed: 2,
      skipped: 0,
    });
    // The page asks for no more rows than the budget has room for.
    expect(limits).toEqual([4]);

    const second = await rerenderAll(steps, { afterId: "0003", maxBodies: 4 });
    expect(second).toMatchObject({ kind: "stopped", resumeAfterId: "0007", checked: 4 });
    const third = await rerenderAll(steps, { afterId: "0007", maxBodies: 4 });
    expect(third).toEqual({ kind: "done", checked: 2, changed: 1, skipped: 0 });

    // Every stale row was written once, in order, across the three runs.
    const stale = rows.filter((row) => row.bodyHtml === "old").map((row) => row.id);
    expect(stored).toEqual(stale);
  });

  test("a budget over several pages reads whole pages, then the rest", async () => {
    const rows = bodies(RERENDER_PAGE_SIZE * 3);
    const limits: number[] = [];

    const outcome = await rerenderAll(stepsOver(rows, [], limits), {
      afterId: null,
      maxBodies: RERENDER_PAGE_SIZE + 7,
    });

    expect(outcome).toMatchObject({ kind: "stopped", checked: RERENDER_PAGE_SIZE + 7 });
    expect(limits).toEqual([RERENDER_PAGE_SIZE, 7]);
  });

  test("a body saved during the run counts as skipped, not changed (#98)", async () => {
    const rows = bodies(6);
    const steps = stepsOver(rows, []);

    const outcome = await rerenderAll<string>(
      {
        ...steps,
        store: (body) => Promise.resolve(body.id === "0003" ? "skipped" : "written"),
      },
      WHOLE_TABLE,
    );

    expect(outcome).toEqual({ kind: "done", checked: 6, changed: 1, skipped: 1 });
  });

  test("the first failure stops the run and comes back as it was", async () => {
    const rows = bodies(5);
    const stored: string[] = [];
    const steps = stepsOver(rows, stored);

    const outcome = await rerenderAll<string>(
      {
        ...steps,
        render: (bodyMd) =>
          bodyMd === "md 0001"
            ? Promise.resolve({ failure: "render broke" })
            : steps.render(bodyMd),
      },
      WHOLE_TABLE,
    );

    expect(outcome).toEqual({ kind: "failed", failure: "render broke" });
    expect(stored).toEqual(["0000"]);
  });

  test("a failed page or store stops the run", async () => {
    const rows = bodies(5);
    const steps = stepsOver(rows, []);

    const pageFailed = await rerenderAll<string>(
      { ...steps, loadPage: () => Promise.resolve({ failure: "load broke" }) },
      WHOLE_TABLE,
    );
    const storeFailed = await rerenderAll<string>(
      { ...steps, store: () => Promise.resolve({ failure: "store broke" }) },
      WHOLE_TABLE,
    );

    expect(pageFailed).toEqual({ kind: "failed", failure: "load broke" });
    expect(storeFailed).toEqual({ kind: "failed", failure: "store broke" });
  });

  test("an unchecked range never reaches a query", async () => {
    const limits: number[] = [];
    await expect(
      rerenderAll(stepsOver(bodies(3), [], limits), { afterId: null, maxBodies: 0 }),
    ).rejects.toThrow();
    expect(limits).toEqual([]);
  });
});

describe("isRerenderRange", () => {
  test("takes no start or a row id, and a whole budget of at least one", () => {
    expect(isRerenderRange({ afterId: null, maxBodies: 1 })).toBe(true);
    expect(
      isRerenderRange({
        afterId: "00000000-0000-4000-8000-000000000301",
        maxBodies: 1000,
      }),
    ).toBe(true);
  });

  test("refuses a start that is not a row id, or an unusable budget", () => {
    expect(isRerenderRange({ afterId: "", maxBodies: 10 })).toBe(false);
    expect(isRerenderRange({ afterId: "1 or 1=1", maxBodies: 10 })).toBe(false);
    expect(isRerenderRange({ afterId: null, maxBodies: 0 })).toBe(false);
    expect(isRerenderRange({ afterId: null, maxBodies: -5 })).toBe(false);
    expect(isRerenderRange({ afterId: null, maxBodies: 2.5 })).toBe(false);
    expect(isRerenderRange({ afterId: null, maxBodies: Number.NaN })).toBe(false);
  });
});
