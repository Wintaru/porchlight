import type { MemberBlock } from "../../../Common/MemberBlock";
import { ResponseBase } from "../../../Common/ResponseBase";

export class MemberBlocksLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly blocks: readonly MemberBlock[],
  ) {
    super(correlationId);
  }
}
