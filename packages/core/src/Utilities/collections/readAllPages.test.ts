import { expect, test } from "vitest";

import { readAllPages } from "./readAllPages";

// A server that answers at most `cap` rows a request, as PostgREST's `max_rows` does.
function server(total: number, cap: number) {
  const asked: number[] = [];
  const page = (from: number, to: number) => {
    asked.push(from);
    const end = Math.min(to + 1, from + cap, total);
    const data = Array.from({ length: Math.max(end - from, 0) }, (_, i) => from + i);
    return Promise.resolve({ data, error: null });
  };
  return { asked, page };
}

test("readAllPages reads past the server's cap without missing a row", async () => {
  const { page } = server(2500, 1000);
  const result = await readAllPages(page);
  expect("rows" in result && result.rows).toEqual(
    Array.from({ length: 2500 }, (_, i) => i),
  );
});

test("readAllPages steps by what came back when the cap is lower than its page", async () => {
  const { asked, page } = server(250, 100);
  const result = await readAllPages(page);
  expect("rows" in result && result.rows.length).toBe(250);
  expect(asked).toEqual([0, 100, 200, 250]);
});

test("readAllPages answers the first error", async () => {
  const result = await readAllPages(() =>
    Promise.resolve({ data: null, error: { message: "boom" } }),
  );
  expect(result).toEqual({ error: "boom" });
});
