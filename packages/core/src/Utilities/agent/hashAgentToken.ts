import { sha256Hex } from "../anonymous/sha256Hex";

// The `agent_tokens.token_hash` column: sha256 of the raw token as lowercase hex, the
// same shape the anonymous secret uses.
export function hashAgentToken(rawToken: string): Promise<string> {
  return sha256Hex(rawToken);
}
