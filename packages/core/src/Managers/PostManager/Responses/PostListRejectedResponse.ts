import { ResponseBase } from "../../../Common/ResponseBase";

// The list request's cap is not usable: 0, a negative number or not a whole number
// (#96). Nothing was read.
export class PostListRejectedResponse extends ResponseBase {}
