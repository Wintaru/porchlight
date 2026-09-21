import { ResponseBase } from "../../../Common/ResponseBase";

// The mint request did not validate: an empty or too-long name, no scope or an unknown
// one, or an expiry that is already past.
export class TokenRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly field: "name" | "scopes" | "expiresAt",
    readonly message: string,
  ) {
    super(correlationId);
  }
}
