import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.moderation_thresholds` (SPEC.md §7). A missing key answers
// DEFAULT_MODERATION_THRESHOLDS, same as every other D20-adjacent key — #12 has not
// seeded this one yet.
export class LoadModerationThresholdsRequest extends RequestBase {}
