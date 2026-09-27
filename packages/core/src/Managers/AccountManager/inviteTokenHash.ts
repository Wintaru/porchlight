import { sha256Hex } from "../../Utilities/anonymous/sha256Hex";

// The `invites.token_hash` column: sha256 of the link's token as lowercase hex, the
// same shape the agent tokens and the anonymous secret use.
export function inviteTokenHash(token: string): Promise<string> {
  return sha256Hex(token.trim());
}
