import type { Environment } from "./Environment";
import type { MediaManagerOptions } from "../Managers/MediaManager/MediaManagerOptions";

const DEFAULT_QUARANTINE_BUCKET = "quarantine";

export function createMediaManagerOptions(env: Environment): MediaManagerOptions {
  const ipHashSalt = env.EVIDENCE_IP_HASH_SALT;
  if (ipHashSalt === undefined || ipHashSalt === "") {
    throw new Error("EVIDENCE_IP_HASH_SALT must be set to finalize an upload.");
  }
  return {
    quarantineBucket: env.STORAGE_BUCKET_QUARANTINE ?? DEFAULT_QUARANTINE_BUCKET,
    ipHashSalt,
  };
}
