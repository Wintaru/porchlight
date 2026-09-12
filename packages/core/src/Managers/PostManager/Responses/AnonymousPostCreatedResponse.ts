import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

// The post, plus what the Client must do with the visitor's identity: set `secret` as
// the httpOnly cookie, and show it once as the claim code when `isNewAuthor` (D7).
export class AnonymousPostCreatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly post: Post,
    readonly secret: string,
    readonly isNewAuthor: boolean,
  ) {
    super(correlationId);
  }
}
