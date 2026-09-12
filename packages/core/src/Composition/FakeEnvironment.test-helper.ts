import type { Environment } from "./Environment";

// The smallest environment that builds a container with no external store: every
// provider that would need a key selects its fake.
export const FAKE_ENV: Environment = { PROFILE_PROVIDER: "fake" };
