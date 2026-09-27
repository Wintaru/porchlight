import { afterEach, describe, expect, test, vi } from "vitest";

import { carriesCronSecret } from "./cron-secret";

function withAuthorization(value?: string): Request {
  return new Request("http://site.test/api/email/digest", {
    headers: value === undefined ? {} : { authorization: value },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("carriesCronSecret", () => {
  test("passes only the exact Bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(carriesCronSecret(withAuthorization("Bearer s3cret"))).toBe(true);
    expect(carriesCronSecret(withAuthorization("Bearer s3cre"))).toBe(false);
    expect(carriesCronSecret(withAuthorization("s3cret"))).toBe(false);
    expect(carriesCronSecret(withAuthorization())).toBe(false);
  });

  test("with no secret set, nothing passes, not even an empty Bearer", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(carriesCronSecret(withAuthorization("Bearer "))).toBe(false);
  });
});
