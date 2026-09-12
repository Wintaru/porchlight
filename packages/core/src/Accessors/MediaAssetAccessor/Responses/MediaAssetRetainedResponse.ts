import { ResponseBase } from "../../../Common/ResponseBase";

// The row's own `retain_until` trigger refused the delete (SPEC.md §7): a locked item
// outlives its retention window regardless of who asks.
export class MediaAssetRetainedResponse extends ResponseBase {}
