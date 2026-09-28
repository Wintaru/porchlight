import type { DbClient } from "@porchlight/db";

// The public key type `getClaims` takes, named from its signature so this file does not
// import @supabase/* (only packages/db does, D2).
type ClaimsOptions = NonNullable<Parameters<DbClient["auth"]["getClaims"]>[1]>;
export type SigningKey = NonNullable<ClaimsOptions["jwks"]>["keys"][number];

export type SigningKeyLookup =
  | { readonly kind: "found"; readonly key: SigningKey }
  | { readonly kind: "unknown" }
  | { readonly kind: "unavailable"; readonly reason: string };

// The one algorithm the door accepts (#88). Supabase Auth signs with ES256 on every
// hosted project with signing keys and on the local stack (both checked 2026-09-27).
export const OAUTH_TOKEN_ALG = "ES256";

// How long the key set is trusted before the next fetch. A key Auth adds (a standby key
// before a rotation) is seen at most this late.
export const SIGNING_KEYS_TTL_MS = 10 * 60 * 1000;

// After a failed fetch, the next try waits this long, so a flood of requests during an
// Auth outage does not become a flood of fetches.
export const SIGNING_KEYS_RETRY_MS = 30 * 1000;

// Auth's public signing keys, fetched at most once per TTL, and only once for many
// requests at the same moment. A token whose `kid` is not in the set is refused with no
// call to Auth (#88): anyone can send one, so it must cost nothing. `getClaims` then
// gets the one key it needs and never fetches on its own.
export class SigningKeyCache {
  private keys: readonly SigningKey[] | undefined;
  private fetchedAt = 0;
  private failure: { readonly at: number; readonly reason: string } | undefined;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly fetchKeySet: () => Promise<unknown>,
    private readonly now: () => number = Date.now,
  ) {}

  async keyFor(kid: string): Promise<SigningKeyLookup> {
    if (this.isStale() && !this.isBackingOff()) {
      this.pending ??= this.refresh().finally(() => {
        this.pending = undefined;
      });
      await this.pending;
    }
    if (this.keys === undefined) {
      return { kind: "unavailable", reason: this.failure?.reason ?? "no signing keys" };
    }
    const key = this.keys.find((candidate) => candidate.kid === kid);
    return key === undefined ? { kind: "unknown" } : { kind: "found", key };
  }

  private isStale(): boolean {
    return this.keys === undefined || this.now() - this.fetchedAt >= SIGNING_KEYS_TTL_MS;
  }

  private isBackingOff(): boolean {
    return (
      this.failure !== undefined && this.now() - this.failure.at < SIGNING_KEYS_RETRY_MS
    );
  }

  // A failed fetch keeps the keys already held: Auth being down for a moment must not
  // turn every good token away. Without keys, the door answers "unavailable".
  private async refresh(): Promise<void> {
    try {
      const keys = es256KeysOf(await this.fetchKeySet());
      if (keys === undefined) {
        throw new Error("the signing key set has an unexpected shape");
      }
      this.keys = keys;
      this.fetchedAt = this.now();
      this.failure = undefined;
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : "signing key fetch failed";
      console.error("oauth signing keys could not be fetched", reason);
      this.failure = { at: this.now(), reason };
    }
  }
}

// The ES256 public keys in a JWKS document. Any other key (RSA, a symmetric key, a key
// with no id) is left out, so a token can never pick it. Undefined when the document
// is not a key set at all.
export function es256KeysOf(body: unknown): readonly SigningKey[] | undefined {
  if (!isRecord(body) || !Array.isArray(body.keys)) {
    return undefined;
  }
  const candidates: readonly unknown[] = body.keys;
  const keys: SigningKey[] = [];
  for (const candidate of candidates) {
    if (
      isRecord(candidate) &&
      candidate.kty === "EC" &&
      candidate.crv === "P-256" &&
      candidate.alg === OAUTH_TOKEN_ALG &&
      (candidate.use === undefined || candidate.use === "sig") &&
      typeof candidate.kid === "string" &&
      candidate.kid !== "" &&
      typeof candidate.x === "string" &&
      typeof candidate.y === "string"
    ) {
      keys.push({
        kty: "EC",
        crv: "P-256",
        alg: OAUTH_TOKEN_ALG,
        kid: candidate.kid,
        x: candidate.x,
        y: candidate.y,
        key_ops: ["verify"],
        ext: true,
      });
    }
  }
  return keys;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
