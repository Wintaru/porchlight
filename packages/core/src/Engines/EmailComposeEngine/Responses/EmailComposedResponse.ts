import type { EmailMessage } from "../../../Common/EmailMessage";
import { ResponseBase } from "../../../Common/ResponseBase";

export class EmailComposedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly message: EmailMessage,
  ) {
    super(correlationId);
  }
}
