import type { DbClient } from "@porchlight/db";

import {
  DEFAULT_MODERATION_THRESHOLDS,
  type ModerationThresholds,
} from "../../../Common/ModerationThresholds";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadModerationThresholdsRequest } from "../Requests/LoadModerationThresholdsRequest";
import { ModerationThresholdsLoadedResponse } from "../Responses/ModerationThresholdsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const THRESHOLDS_KEY = "moderation_thresholds";

function toThresholds(value: unknown): ModerationThresholds | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { flag_at: flagAt, lock_at: lockAt } = value as Record<string, unknown>;
  if (
    typeof flagAt !== "number" ||
    typeof lockAt !== "number" ||
    flagAt <= 0 ||
    lockAt <= 0 ||
    flagAt > lockAt
  ) {
    return undefined;
  }
  return { flagAt, lockAt };
}

export class SupabaseLoadModerationThresholdsHandler implements IHandler<
  LoadModerationThresholdsRequest,
  ModerationThresholdsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadModerationThresholdsRequest,
  ): Promise<ModerationThresholdsLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", THRESHOLDS_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ModerationThresholdsLoadedResponse(
        request.correlationId,
        DEFAULT_MODERATION_THRESHOLDS,
      );
    }
    const thresholds = toThresholds(data.value);
    if (thresholds === undefined) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${THRESHOLDS_KEY} holds ${JSON.stringify(data.value)}, not {flag_at, lock_at}`,
      );
    }
    return new ModerationThresholdsLoadedResponse(request.correlationId, thresholds);
  }
}
