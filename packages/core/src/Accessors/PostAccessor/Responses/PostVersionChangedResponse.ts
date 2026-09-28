import { ResponseBase } from "../../../Common/ResponseBase";

// The post exists, but a write since the caller read it moved its version (#100).
// Nothing was written.
export class PostVersionChangedResponse extends ResponseBase {}
