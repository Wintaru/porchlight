import { ResponseBase } from "../../../Common/ResponseBase";

// The target post or comment does not exist, or is a tombstone with nothing left to
// moderate.
export class NoSuchItemResponse extends ResponseBase {}
