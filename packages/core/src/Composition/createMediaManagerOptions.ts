import type { Environment } from "./Environment";
import type { MediaManagerOptions } from "../Managers/MediaManager/MediaManagerOptions";

const DEFAULT_QUARANTINE_BUCKET = "quarantine";

export function createMediaManagerOptions(env: Environment): MediaManagerOptions {
  return {
    quarantineBucket: env.STORAGE_BUCKET_QUARANTINE ?? DEFAULT_QUARANTINE_BUCKET,
  };
}
