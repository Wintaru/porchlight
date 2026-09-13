import { ArachnidShieldMatchImageHashHandler } from "../Accessors/HashMatchAccessor/Handlers/ArachnidShieldMatchImageHashHandler";
import { FakeMatchImageHashHandler } from "../Accessors/HashMatchAccessor/Handlers/FakeMatchImageHashHandler";
import {
  FAKE_HASH_MATCH_RESULTS,
  FakeHashMatchState,
  type FakeHashMatchResult,
} from "../Accessors/HashMatchAccessor/FakeHashMatchState";
import { HashMatchAccessor } from "../Accessors/HashMatchAccessor/HashMatchAccessor";
import type { IHashMatchAccessor } from "../Accessors/HashMatchAccessor/IHashMatchAccessor";
import { MatchImageHashRequest } from "../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";

const HASH_MATCH_PROVIDERS = ["fake", "arachnid-shield", "photodna"] as const;
type HashMatchProvider = (typeof HASH_MATCH_PROVIDERS)[number];

function isHashMatchProvider(value: string): value is HashMatchProvider {
  return HASH_MATCH_PROVIDERS.some((provider) => provider === value);
}

function isFakeHashMatchResult(value: string): value is FakeHashMatchResult {
  return FAKE_HASH_MATCH_RESULTS.some((result) => result === value);
}

// Known-illegal image fingerprint matching (SPEC.md §7, WAYFINDER D17b). Arachnid
// Shield is the approved default; PhotoDNA is a reserved slot for later, same as every
// other `*_PROVIDER` switch (D19): a production build never falls back to the fake.
export function createHashMatchAccessor(env: Environment): IHashMatchAccessor {
  const provider = env.HASH_MATCH_PROVIDER ?? "fake";
  if (!isHashMatchProvider(provider)) {
    throw new Error(
      `HASH_MATCH_PROVIDER=${provider} is not a known provider. Known: ${HASH_MATCH_PROVIDERS.join(", ")}.`,
    );
  }
  if (provider === "fake") {
    if (env.NODE_ENV === "production") {
      throw new Error("HASH_MATCH_PROVIDER=fake is not allowed in a production build.");
    }
    const result = env.HASH_MATCH_FAKE_RESULT ?? "clear";
    if (!isFakeHashMatchResult(result)) {
      throw new Error(
        `HASH_MATCH_FAKE_RESULT=${result} is not one of ${FAKE_HASH_MATCH_RESULTS.join(", ")}.`,
      );
    }
    return new HashMatchAccessor(
      new HandlerResolverBuilder()
        .register(
          MatchImageHashRequest,
          new FakeMatchImageHashHandler(new FakeHashMatchState(result)),
        )
        .build(),
    );
  }
  const apiKey = env.HASH_MATCH_API_KEY?.trim() ?? "";
  if (apiKey === "") {
    throw new Error(`HASH_MATCH_PROVIDER=${provider} needs HASH_MATCH_API_KEY set.`);
  }
  if (provider === "photodna") {
    throw new Error("HASH_MATCH_PROVIDER=photodna is a reserved slot, not yet built.");
  }
  return new HashMatchAccessor(
    new HandlerResolverBuilder()
      .register(MatchImageHashRequest, new ArachnidShieldMatchImageHashHandler(apiKey))
      .build(),
  );
}
