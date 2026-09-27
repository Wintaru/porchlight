import { ResponseBase } from "../../../Common/ResponseBase";
import type { VoiceGuideRevision } from "../../../Common/VoiceGuideRevision";

export class VoiceGuideRevisionsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly revisions: readonly VoiceGuideRevision[],
  ) {
    super(correlationId);
  }
}
