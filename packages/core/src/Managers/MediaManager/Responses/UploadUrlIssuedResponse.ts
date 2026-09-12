import { ResponseBase } from "../../../Common/ResponseBase";

// `uploadUrl` is already the complete URL to PUT the file to (storage origin, bucket,
// path and a scoped token all embedded by Supabase Storage's own
// `createSignedUploadUrl`); no separate token is needed to use it.
export class UploadUrlIssuedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly mediaId: string,
    readonly path: string,
    readonly uploadUrl: string,
  ) {
    super(correlationId);
  }
}
