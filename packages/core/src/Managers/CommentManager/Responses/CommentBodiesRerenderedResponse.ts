import { ResponseBase } from "../../../Common/ResponseBase";

// `checked` bodies read, `changed` of them written with new HTML.
export class CommentBodiesRerenderedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly checked: number,
    readonly changed: number,
  ) {
    super(correlationId);
  }
}
