import type { EmailMessage } from "../../../Common/EmailMessage";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailState } from "../FakeEmailState";
import type { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../Responses/EmailsSentResponse";
import { unsubscribeHeaders } from "../unsubscribeHeaders";

// "Name <address>" or a bare address, the two shapes EMAIL_FROM takes.
const NAMED_ADDRESS = /^\s*(.*?)\s*<([^>]+)>\s*$/;

// Keeps every message, logs one line per send, and delivers to the local mail catcher
// when one is named. The log names the subject and the count only: the body carries
// confirmation and unsubscribe links, and an address is personal data.
export class FakeSendEmailsHandler implements IHandler<
  SendEmailsRequest,
  EmailsSentResponse | EmailAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailState) {}

  async handle(
    request: SendEmailsRequest,
  ): Promise<EmailsSentResponse | EmailAccessFailedResponse> {
    const { correlationId, messages } = request;
    if (this.state.failing) {
      return new EmailAccessFailedResponse(correlationId, "EMAIL_FAKE_RESULT=fail");
    }
    const { mailpitUrl } = this.state;
    if (mailpitUrl !== null) {
      for (const message of messages) {
        const failed = await this.deliver(mailpitUrl, message);
        if (failed !== undefined) {
          return new EmailAccessFailedResponse(correlationId, failed);
        }
      }
    }
    this.state.sent.push(...messages);
    for (const message of messages) {
      console.info(`[email:fake] ${message.subject}`);
    }
    return new EmailsSentResponse(correlationId, messages.length);
  }

  // Mailpit's own send API (POST /api/v1/send), so the fake needs no SMTP client.
  private async deliver(
    mailpitUrl: string,
    message: EmailMessage,
  ): Promise<string | undefined> {
    const named = NAMED_ADDRESS.exec(this.state.from);
    const from =
      named === null
        ? { Email: this.state.from.trim() }
        : { Name: named[1] ?? "", Email: named[2] ?? "" };
    try {
      const response = await fetch(`${mailpitUrl.replace(/\/+$/, "")}/api/v1/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          From: from,
          To: [{ Email: message.to }],
          Subject: message.subject,
          Text: message.text,
          HTML: message.html,
          Headers: unsubscribeHeaders(message),
        }),
      });
      return response.ok ? undefined : `mailpit answered ${String(response.status)}`;
    } catch (error: unknown) {
      return error instanceof Error ? error.message : String(error);
    }
  }
}
