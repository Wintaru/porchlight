import { ResponseBase } from "../../../Common/ResponseBase";

// The delete was refused because replies still point at this comment (D5). The row is
// untouched.
export class CommentHasRepliesResponse extends ResponseBase {}
