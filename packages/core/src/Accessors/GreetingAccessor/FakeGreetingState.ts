import type { FakeGreetingResult } from "./FakeGreetingResult";

export const DEFAULT_GREETING = "Hello from Porchlight";

// The fake's "database": one greeting in memory plus the toggle. Both fake handlers hold
// the same instance, which is what lets a store show up on the next load.
export class FakeGreetingState {
  greeting: string = DEFAULT_GREETING;

  constructor(readonly result: FakeGreetingResult) {}
}
