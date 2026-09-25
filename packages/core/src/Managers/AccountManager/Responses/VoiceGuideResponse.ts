import type { VoiceGuide } from "../../../Common/VoiceGuide";
import { ResponseBase } from "../../../Common/ResponseBase";

export class VoiceGuideResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly guide: VoiceGuide,
  ) {
    super(correlationId);
  }
}
