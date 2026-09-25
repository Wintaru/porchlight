import { ResponseBase } from "../../../Common/ResponseBase";

// The guide as stored, or null when the member has not written one.
export class VoiceGuideLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly guideMd: string | null,
  ) {
    super(correlationId);
  }
}
