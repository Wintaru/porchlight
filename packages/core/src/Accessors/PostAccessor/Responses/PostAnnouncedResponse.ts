import { ResponseBase } from "../../../Common/ResponseBase";

// `count` notices were written: 0 when the post was not claimed (already announced, not
// out, not public) or nobody follows it.
export class PostAnnouncedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
