import type { IHandler } from "../../../Common/IHandler";
import type { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailDisabledResponse } from "../Responses/EmailDisabledResponse";

// EMAIL_PROVIDER unset or `none`: the deployment has no mail vendor yet, so every send
// says so instead of pretending (docs/setup/email.md).
export class DisabledSendEmailsHandler implements IHandler<
  SendEmailsRequest,
  EmailDisabledResponse
> {
  handle(request: SendEmailsRequest): Promise<EmailDisabledResponse> {
    return Promise.resolve(new EmailDisabledResponse(request.correlationId));
  }
}
