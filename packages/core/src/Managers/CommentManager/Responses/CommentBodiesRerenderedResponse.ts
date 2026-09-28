import { ResponseBase } from "../../../Common/ResponseBase";

// `checked` bodies read, `changed` of them written with new HTML, and `skipped` ones
// whose HTML changed but that were saved during the run, so their own HTML stays (#98).
// `resumeAfterId` is null when the table is done, or the id the next request starts
// after when this one used its budget.
export class CommentBodiesRerenderedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly checked: number,
    readonly changed: number,
    readonly skipped: number,
    readonly resumeAfterId: string | null,
  ) {
    super(correlationId);
  }
}
