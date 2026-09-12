import { afterEach, describe, expect, test, vi } from "vitest";

// The route reads the container at import, so each test that needs a different
// environment stubs it first and imports a fresh module graph. The container also wires
// the profile store, which must not touch the stack from a unit test.
async function loadRoute(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("PROFILE_PROVIDER", "fake");
  vi.stubEnv("POST_PROVIDER", "fake");
  vi.stubEnv("COMMENT_PROVIDER", "fake");
  vi.stubEnv("REACTION_PROVIDER", "fake");
  vi.stubEnv("SITE_CONFIG_PROVIDER", "fake");
  vi.stubEnv("ANONYMOUS_AUTHOR_PROVIDER", "fake");
  vi.stubEnv("BLOCK_PROVIDER", "fake");
  vi.stubEnv("RATE_LIMIT_PROVIDER", "fake");
  // Required unconditionally by createAnonymousGuardEngine, even with every store faked.
  vi.stubEnv("EVIDENCE_IP_HASH_SALT", "test-salt");
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  return import("./route");
}

function post(body: unknown, raw = false): Request {
  return new Request("http://porchlight.test/api/greeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw && typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/greeting", () => {
  test("returns the current greeting with its correlation id", async () => {
    const route = await loadRoute();

    const response = await route.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      greeting: "Hello from Porchlight",
      correlationId: expect.any(String) as string,
    });
  });

  test("answers 503 when the store is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const route = await loadRoute({ GREETING_FAKE_RESULT: "fail" });

    const response = await route.GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "The greeting store is unavailable.",
    });
  });
});

describe("POST /api/greeting", () => {
  test("stores the greeting and the next GET returns it", async () => {
    const route = await loadRoute();

    const posted = await route.POST(post({ greeting: "  Evening, neighbor  " }));
    const got = await route.GET();

    expect(posted.status).toBe(200);
    await expect(posted.json()).resolves.toMatchObject({ greeting: "Evening, neighbor" });
    await expect(got.json()).resolves.toMatchObject({ greeting: "Evening, neighbor" });
  });

  test("a greeting at the cap with padding is accepted after the trim", async () => {
    const route = await loadRoute();

    const response = await route.POST(post({ greeting: ` ${"x".repeat(200)} ` }));

    expect(response.status).toBe(200);
  });

  test("answers 500 with the correlation id when a handler throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const route = await loadRoute();
    const { getDependencyContainer } = await import("@/lib/dependency-container");
    vi.spyOn(getDependencyContainer().greetingManager, "query").mockRejectedValue(
      new Error("boom"),
    );

    const response = await route.GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unexpected response.",
      correlationId: expect.any(String) as string,
    });
  });

  test.each([
    ["not JSON", "{not json", true],
    ["no greeting field", { hello: "x" }, false],
    ["a non-string greeting", { greeting: 7 }, false],
    ["a blank greeting", { greeting: "   " }, false],
    ["a greeting over the cap", { greeting: "x".repeat(201) }, false],
  ])("rejects %s with 400", async (_label, body, raw) => {
    const route = await loadRoute();

    const response = await route.POST(post(body, raw));

    expect(response.status).toBe(400);
  });
});
