import { ResponseBase } from "../../../Common/ResponseBase";

// No row matched the store: the comment was edited, removed or made a tombstone after
// the re-render read it (#98). Nothing was written, and the newer HTML stays.
export class CommentBodyChangedSinceReadResponse extends ResponseBase {}
