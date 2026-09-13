import type { ModerationThresholds } from "../../../Common/ModerationThresholds";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ModerationThresholdsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly thresholds: ModerationThresholds,
  ) {
    super(correlationId);
  }
}
