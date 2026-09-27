import type { IHandler } from "../../../Common/IHandler";
import type { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../Responses/EmailsSentResponse";
import { unsubscribeHeaders } from "../unsubscribeHeaders";

const BATCH_URL = "https://api.resend.com/emails/batch";
// Resend takes at most 100 messages in one batch call. One call per 100 keeps a sweep
// under the account's default limit of two requests a second.
const BATCH_SIZE = 100;

// Resend's batch endpoint (docs/setup/email.md). A batch is all or nothing on Resend's
// side: one invalid message fails the call. A later chunk that fails after an earlier one
// went out reports failure for the whole request, so the caller can resend the earlier
// chunk. That is a duplicate email, which is better than a lost one for a digest.
export class ResendSendEmailsHandler implements IHandler<
  SendEmailsRequest,
  EmailsSentResponse | EmailAccessFailedResponse
> {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async handle(
    request: SendEmailsRequest,
  ): Promise<EmailsSentResponse | EmailAccessFailedResponse> {
    const { correlationId, messages } = request;
    for (let start = 0; start < messages.length; start += BATCH_SIZE) {
      const chunk = messages.slice(start, start + BATCH_SIZE);
      try {
        const response = await fetch(BATCH_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(
            chunk.map((message) => ({
              from: this.from,
              to: [message.to],
              subject: message.subject,
              text: message.text,
              html: message.html,
              headers: unsubscribeHeaders(message),
            })),
          ),
        });
        if (!response.ok) {
          // Resend's error body names the problem (a bad key, an unverified domain)
          // and never echoes the key or the recipients.
          const body = await response.text();
          return new EmailAccessFailedResponse(
            correlationId,
            `resend answered ${String(response.status)}: ${body.slice(0, 300)}`,
          );
        }
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        return new EmailAccessFailedResponse(correlationId, reason);
      }
    }
    return new EmailsSentResponse(correlationId, messages.length);
  }
}
