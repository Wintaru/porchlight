import { ResponseBase } from "../../../Common/ResponseBase";

// The guide is longer than the store takes (VOICE_GUIDE_MAX_LENGTH).
export class VoiceGuideRejectedResponse extends ResponseBase {
  readonly reason = "too-long";
}
