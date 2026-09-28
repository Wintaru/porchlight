import type { AfterResponse } from "../Common/AfterResponse";

// What the Client can hand the container beyond the environment: hooks into the
// framework it runs in.
export interface DependencyContainerOptions {
  readonly afterResponse?: AfterResponse;
}
