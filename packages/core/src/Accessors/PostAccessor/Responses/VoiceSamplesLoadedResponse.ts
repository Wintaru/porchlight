import type { VoiceSample } from "../../../Common/VoiceSample";
import { ResponseBase } from "../../../Common/ResponseBase";

export class VoiceSamplesLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly samples: readonly VoiceSample[],
  ) {
    super(correlationId);
  }
}
