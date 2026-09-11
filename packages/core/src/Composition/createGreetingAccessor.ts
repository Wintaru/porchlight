import { FakeGreetingAccessor } from "../Accessors/GreetingAccessor/FakeGreetingAccessor";
import {
  FAKE_GREETING_RESULTS,
  isFakeGreetingResult,
} from "../Accessors/GreetingAccessor/FakeGreetingResult";
import { FakeGreetingState } from "../Accessors/GreetingAccessor/FakeGreetingState";
import { FakeLoadGreetingHandler } from "../Accessors/GreetingAccessor/Handlers/FakeLoadGreetingHandler";
import { FakeStoreGreetingHandler } from "../Accessors/GreetingAccessor/Handlers/FakeStoreGreetingHandler";
import type { IGreetingAccessor } from "../Accessors/GreetingAccessor/IGreetingAccessor";
import { LoadGreetingRequest } from "../Accessors/GreetingAccessor/Requests/LoadGreetingRequest";
import { StoreGreetingRequest } from "../Accessors/GreetingAccessor/Requests/StoreGreetingRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";

// The one list of implementations for this domain. The guard below narrows to it, so a
// new provider is added here and in one branch of createGreetingAccessor, nowhere else.
const GREETING_PROVIDERS = ["fake"] as const;
type GreetingProvider = (typeof GREETING_PROVIDERS)[number];
const DEFAULT_PROVIDER: GreetingProvider = "fake";
const DEFAULT_FAKE_RESULT = "ok";

function isGreetingProvider(value: string): value is GreetingProvider {
  return GREETING_PROVIDERS.some((provider) => provider === value);
}

// Picks the accessor implementation from the environment, the way every external
// accessor will (D19). An unknown value throws at startup rather than falling back, so a
// typo in config cannot select a provider the operator did not name. An unset variable
// selects the fake, which suits local dev for this example. A real accessor with a
// production provider should decide whether unset is an error (issue #10).
export function createGreetingAccessor(env: Environment): IGreetingAccessor {
  const provider = env.GREETING_PROVIDER ?? DEFAULT_PROVIDER;
  if (!isGreetingProvider(provider)) {
    throw new Error(
      `GREETING_PROVIDER=${provider} is not a known provider. Known: ${GREETING_PROVIDERS.join(", ")}.`,
    );
  }

  // `provider` is narrowed to the list. With one entry there is nothing to branch on. The
  // second provider turns this into a `switch` over GreetingProvider.
  return createFakeGreetingAccessor(env);
}

function createFakeGreetingAccessor(env: Environment): IGreetingAccessor {
  const result = env.GREETING_FAKE_RESULT ?? DEFAULT_FAKE_RESULT;
  if (!isFakeGreetingResult(result)) {
    throw new Error(
      `GREETING_FAKE_RESULT=${result} is not a known result. Known: ${FAKE_GREETING_RESULTS.join(", ")}.`,
    );
  }

  const state = new FakeGreetingState(result);
  return new FakeGreetingAccessor(
    new HandlerResolverBuilder()
      .register(StoreGreetingRequest, new FakeStoreGreetingHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadGreetingRequest, new FakeLoadGreetingHandler(state))
      .build(),
  );
}
