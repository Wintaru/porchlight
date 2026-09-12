import { base32Encode } from "./base32Encode";

// 256 bits of randomness (SPEC.md §4), rendered once as base32 so the same text can
// travel as the cookie value and as the claim code a person writes down.
const SECRET_BYTES = 32;

export function generateAnonymousSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}
