import { ResponseBase } from "../../../Common/ResponseBase";

// `checked` bodies read, `changed` of them written with new HTML.
export class PostBodiesRerenderedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly checked: number,
    readonly changed: number,
  ) {
    super(correlationId);
  }
}
