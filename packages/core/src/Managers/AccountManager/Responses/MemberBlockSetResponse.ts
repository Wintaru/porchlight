import type { MemberBlockLevel } from "../../../Common/MemberBlockLevel";
import { ResponseBase } from "../../../Common/ResponseBase";

// The actor's level for that member is now `level`.
export class MemberBlockSetResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly level: MemberBlockLevel | "none",
  ) {
    super(correlationId);
  }
}
