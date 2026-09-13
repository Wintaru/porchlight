import { ResponseBase } from "../../../Common/ResponseBase";

// Held for a moderator: shown blurred and grayscale in the queue, cannot publish until
// approved (SPEC.md §7).
export class ContentFlaggedResponse extends ResponseBase {}
