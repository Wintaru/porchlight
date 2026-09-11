import { expect, test } from "@playwright/test";

// The issue #2 acceptance test: a request round-trips through a route handler, the
// composition root, a Manager, a handler and the fake accessor in a running dev server.
test.describe.configure({ mode: "serial" });

test("GET /api/greeting returns a greeting", async ({ request }) => {
  const response = await request.get("/api/greeting");

  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ greeting: expect.any(String) });
});

test("POST /api/greeting stores a greeting that the next GET returns", async ({
  request,
}) => {
  const greeting = `Porch light on at ${new Date().toISOString()}`;

  const posted = await request.post("/api/greeting", { data: { greeting } });
  expect(posted.status()).toBe(200);

  const got = await request.get("/api/greeting");
  expect(got.status()).toBe(200);
  const body: unknown = await got.json();
  expect(body).toMatchObject({ greeting });
});

test("POST /api/greeting rejects a bad body with 400", async ({ request }) => {
  const response = await request.post("/api/greeting", { data: { greeting: "" } });

  expect(response.status()).toBe(400);
});
