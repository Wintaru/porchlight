import { ResponseBase } from "../../../Common/ResponseBase";

// Not one of this member's tokens. The same answer for another member's token and for
// an unknown id, so the response never confirms a token exists.
export class NoSuchTokenResponse extends ResponseBase {}
