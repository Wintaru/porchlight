import { ResponseBase } from "../../../Common/ResponseBase";
import type { AnonymousGuardDenialReason } from "../../../Engines/AnonymousGuardEngine/AnonymousGuardDenialReason";

// The D15 admission guard said no, after the permission check already said the
// anonymous door is open (SPEC.md §4).
export class CommentGuardRefusedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AnonymousGuardDenialReason,
  ) {
    super(correlationId);
  }
}
