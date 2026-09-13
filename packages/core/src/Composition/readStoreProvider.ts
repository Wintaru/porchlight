import type { Environment } from "./Environment";

// The provider switch every store-backed accessor reads (D19). `supabase` is the default
// and needs the service-role keys; a missing key throws at startup rather than falling
// back, so a deployment never runs on an in-memory store by accident. `fake` is for
// tests and for a Client that must not touch the stack, and is refused in production
// unless ALLOW_FAKE_PROVIDERS=1 — a deliberate, named override for a degraded
// deployment, never a silent fallback (SPEC.md §7, #12).
export const STORE_PROVIDERS = ["supabase", "fake"] as const;
export type StoreProvider = (typeof STORE_PROVIDERS)[number];
const DEFAULT_PROVIDER: StoreProvider = "supabase";

// What a fake store does: answer normally, or fail every call for the error path.
export const FAKE_RESULTS = ["ok", "fail"] as const;
export type FakeResult = (typeof FAKE_RESULTS)[number];
const DEFAULT_FAKE_RESULT: FakeResult = "ok";

function isStoreProvider(value: string): value is StoreProvider {
  return STORE_PROVIDERS.some((provider) => provider === value);
}

function isFakeResult(value: string): value is FakeResult {
  return FAKE_RESULTS.some((result) => result === value);
}

// Whether the current environment may run a fake provider: never in production, unless
// an admin has deliberately set ALLOW_FAKE_PROVIDERS=1 for a degraded deployment. Every
// `*_PROVIDER` factory in this folder shares this one check (D19, #12's config
// validation), so the override lives in exactly one place.
export function isFakeAllowedHere(env: Environment): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_FAKE_PROVIDERS === "1";
}

// Throws with `message` unless the current environment may run a fake provider. Every
// accessor factory that gates its own fake branch (Turnstile, hash matching, the image
// classifier — none of which go through `readStoreProvider` itself) calls this instead
// of hand-rolling the same `NODE_ENV === "production"` check.
export function assertFakeAllowedHere(env: Environment, message: string): void {
  if (!isFakeAllowedHere(env)) {
    throw new Error(`${message} Set ALLOW_FAKE_PROVIDERS=1 to run one anyway.`);
  }
}

export function readStoreProvider(env: Environment, variable: string): StoreProvider {
  const provider = env[variable] ?? DEFAULT_PROVIDER;
  if (!isStoreProvider(provider)) {
    throw new Error(
      `${variable}=${provider} is not a known provider. Known: ${STORE_PROVIDERS.join(", ")}.`,
    );
  }
  if (provider === "fake") {
    assertFakeAllowedHere(env, `${variable}=fake is not allowed in a production build.`);
  }
  return provider;
}

export function readFakeResult(env: Environment, variable: string): FakeResult {
  const result = env[variable] ?? DEFAULT_FAKE_RESULT;
  if (!isFakeResult(result)) {
    throw new Error(
      `${variable}=${result} is not a known result. Known: ${FAKE_RESULTS.join(", ")}.`,
    );
  }
  return result;
}
