import { ResponseBase } from "../../../Common/ResponseBase";

// RejectItem's reason is required (SPEC.md §7) — an empty or whitespace-only string
// refuses the same as a missing one.
export class ReasonRequiredResponse extends ResponseBase {}
