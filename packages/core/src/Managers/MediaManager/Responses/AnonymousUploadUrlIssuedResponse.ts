import { ResponseBase } from "../../../Common/ResponseBase";

// Plus what the Client must do with the visitor's identity: set `secret` as the
// httpOnly cookie when `isNewAuthor`, the same shape `AnonymousPostCreatedResponse`
// carries (D7). `uploadUrl` is already complete — see `UploadUrlIssuedResponse`'s own
// comment.
export class AnonymousUploadUrlIssuedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly mediaId: string,
    readonly path: string,
    readonly uploadUrl: string,
    readonly secret: string,
    readonly isNewAuthor: boolean,
  ) {
    super(correlationId);
  }
}
