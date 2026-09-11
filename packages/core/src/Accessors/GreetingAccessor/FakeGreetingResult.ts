// The toggle a developer flips through GREETING_FAKE_RESULT. `ok` behaves like a healthy
// store. `fail` makes every call answer GreetingAccessFailedResponse, so the error path
// can be exercised with no vendor and no outage (D19).
export const FAKE_GREETING_RESULTS = ["ok", "fail"] as const;

export type FakeGreetingResult = (typeof FAKE_GREETING_RESULTS)[number];

export function isFakeGreetingResult(value: string): value is FakeGreetingResult {
  return FAKE_GREETING_RESULTS.some((result) => result === value);
}
