import type { DbClient } from "@porchlight/db";

import { FakeBumpRateLimitHandler } from "../Accessors/RateLimitAccessor/Handlers/FakeBumpRateLimitHandler";
import { SupabaseBumpRateLimitHandler } from "../Accessors/RateLimitAccessor/Handlers/SupabaseBumpRateLimitHandler";
import { FakeRateLimitState } from "../Accessors/RateLimitAccessor/FakeRateLimitState";
import type { IRateLimitAccessor } from "../Accessors/RateLimitAccessor/IRateLimitAccessor";
import { RateLimitAccessor } from "../Accessors/RateLimitAccessor/RateLimitAccessor";
import { BumpRateLimitRequest } from "../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the D15 rate limits.
export function createRateLimitAccessor(
  env: Environment,
  db: () => DbClient,
): IRateLimitAccessor {
  switch (readStoreProvider(env, "RATE_LIMIT_PROVIDER")) {
    case "supabase":
      return new RateLimitAccessor(
        new HandlerResolverBuilder()
          .register(BumpRateLimitRequest, new SupabaseBumpRateLimitHandler(db()))
          .build(),
      );
    case "fake": {
      const state = new FakeRateLimitState(
        readFakeResult(env, "RATE_LIMIT_FAKE_RESULT") === "fail",
      );
      return new RateLimitAccessor(
        new HandlerResolverBuilder()
          .register(BumpRateLimitRequest, new FakeBumpRateLimitHandler(state))
          .build(),
      );
    }
  }
}
