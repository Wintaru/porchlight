import { AGENT_TOKEN_PREFIX } from "../../Common/AgentToken";

// `plt_` + 32 random bytes as base64url (SPEC.md §17): 256 bits, URL- and
// header-safe, no padding. Web Crypto, so the utility stays runtime-neutral.
const TOKEN_BYTES = 32;

export function generateAgentToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return AGENT_TOKEN_PREFIX + base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
