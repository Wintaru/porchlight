import { ResponseBase } from "../../../Common/ResponseBase";

// `signedUrl` already has Supabase's own upload token embedded in its query string —
// no caller needs it separately.
export class SignedUploadUrlCreatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly signedUrl: string,
  ) {
    super(correlationId);
  }
}
