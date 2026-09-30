import { describe, expect, test } from "vitest";

import { SiteConfigCache } from "./SiteConfigCache";

const TTL_MS = 30_000;

function cacheOf(answers: ({ key: string; value: string }[] | "fail")[]) {
  let clock = 0;
  let queries = 0;
  const config = new SiteConfigCache(
    () => {
      const answer = answers[Math.min(queries, answers.length - 1)] ?? "fail";
      queries += 1;
      return Promise.resolve(
        answer === "fail"
          ? { data: null, error: { message: "down" } }
          : { data: answer, error: null },
      );
    },
    TTL_MS,
    () => clock,
  );
  return {
    config,
    queries: () => queries,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("SiteConfigCache", () => {
  test("answers every key from one read until the copy is older than the TTL", async () => {
    const { config, queries, advance } = cacheOf([
      [{ key: "posting", value: "anyone" }],
      [{ key: "posting", value: "members" }],
    ]);

    expect(await config.row("posting")).toEqual({
      data: { value: "anyone" },
      error: null,
    });
    expect(await config.row("comments")).toEqual({ data: null, error: null });
    advance(TTL_MS - 1);
    expect(await config.row("posting")).toEqual({
      data: { value: "anyone" },
      error: null,
    });
    expect(queries()).toBe(1);

    advance(1);
    expect(await config.row("posting")).toEqual({
      data: { value: "members" },
      error: null,
    });
    expect(queries()).toBe(2);
  });

  test("reads again after forget, as a save does", async () => {
    const { config, queries } = cacheOf([
      [{ key: "posting", value: "anyone" }],
      [{ key: "posting", value: "members" }],
    ]);

    await config.row("posting");
    config.forget();

    expect(await config.row("posting")).toEqual({
      data: { value: "members" },
      error: null,
    });
    expect(queries()).toBe(2);
  });

  test("shares one read between callers that ask at once", async () => {
    const { config, queries } = cacheOf([[{ key: "region", value: "us" }]]);

    await Promise.all([config.row("region"), config.rows(["region", "site_name"])]);

    expect(queries()).toBe(1);
  });

  test("answers only the keys that exist, and does not keep a failed read", async () => {
    const { config, queries } = cacheOf(["fail", [{ key: "site_name", value: "Porch" }]]);

    expect(await config.rows(["site_name"])).toEqual({
      data: null,
      error: { message: "down" },
    });
    expect(await config.rows(["site_name", "site_tagline"])).toEqual({
      data: [{ key: "site_name", value: "Porch" }],
      error: null,
    });
    expect(queries()).toBe(2);
  });

  test("a read begun before a save is not kept once the save forgets it", async () => {
    let finishOld: (value: {
      data: { key: string; value: string }[];
      error: null;
    }) => void = () => undefined;
    let queries = 0;
    const config = new SiteConfigCache(() => {
      queries += 1;
      return queries === 1
        ? new Promise((resolve) => {
            finishOld = resolve;
          })
        : Promise.resolve({ data: [{ key: "posting", value: "members" }], error: null });
    }, TTL_MS);

    const old = config.row("posting");
    config.forget();
    finishOld({ data: [{ key: "posting", value: "anyone" }], error: null });
    await old;

    expect(await config.row("posting")).toEqual({
      data: { value: "members" },
      error: null,
    });
    expect(queries).toBe(2);
  });

  test("a query that throws is a failed read, and is not kept", async () => {
    let queries = 0;
    const config = new SiteConfigCache(() => {
      queries += 1;
      return queries === 1
        ? Promise.reject(new Error("socket closed"))
        : Promise.resolve({ data: [], error: null });
    }, TTL_MS);

    expect(await config.row("posting")).toEqual({
      data: null,
      error: { message: "socket closed" },
    });
    expect(await config.row("posting")).toEqual({ data: null, error: null });
  });
});
