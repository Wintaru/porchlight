import type { EmailOptions } from "./emailOptions";

// What SubscribeHandler needs beyond EmailOptions: the salt every address hash uses
// (EVIDENCE_IP_HASH_SALT, as the anonymous guard does, D15).
export interface SubscribeOptions extends EmailOptions {
  readonly ipHashSalt: string;
}
