import type { Environment } from "./Environment";
import { quarantineBucketOf } from "./mediaBuckets";
import type { MediaManagerOptions } from "../Managers/MediaManager/MediaManagerOptions";

export function createMediaManagerOptions(env: Environment): MediaManagerOptions {
  const ipHashSalt = env.EVIDENCE_IP_HASH_SALT;
  if (ipHashSalt === undefined || ipHashSalt === "") {
    throw new Error("EVIDENCE_IP_HASH_SALT must be set to finalize an upload.");
  }
  return {
    quarantineBucket: quarantineBucketOf(env),
    ipHashSalt,
  };
}
