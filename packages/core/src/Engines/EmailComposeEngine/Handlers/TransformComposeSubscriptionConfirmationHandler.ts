import { EMAIL_PATHS } from "../../../Common/EmailSite";
import type { IHandler } from "../../../Common/IHandler";
import { renderEmail } from "../emailLayout";
import type { ComposeSubscriptionConfirmationRequest } from "../Requests/ComposeSubscriptionConfirmationRequest";
import { EmailComposedResponse } from "../Responses/EmailComposedResponse";

const SCHEDULE_TEXT = {
  off: "never",
  hourly: "at most once an hour",
  daily: "at most once a day",
} as const;

// Anyone can type any address into the form, so this email says what was asked, that
// nothing happens without the click, and carries no unsubscribe link: there is nothing
// to unsubscribe from yet.
export class TransformComposeSubscriptionConfirmationHandler implements IHandler<
  ComposeSubscriptionConfirmationRequest,
  EmailComposedResponse
> {
  handle(
    request: ComposeSubscriptionConfirmationRequest,
  ): Promise<EmailComposedResponse> {
    const { email, confirmToken, authorLabel, digest, site, correlationId } = request;
    const scope = authorLabel === null ? site.name : `${authorLabel} on ${site.name}`;
    const confirmUrl = `${site.url}${EMAIL_PATHS.confirmPage}?token=${encodeURIComponent(confirmToken)}`;
    const { text, html } = renderEmail(
      [
        {
          text: `Someone asked to get new posts from ${scope} by email, ${SCHEDULE_TEXT[digest]}.`,
        },
        { text: "Confirm the subscription", href: confirmUrl },
      ],
      [
        {
          text: "If that was not you, ignore this email. Nothing more is sent unless you confirm.",
        },
      ],
    );
    return Promise.resolve(
      new EmailComposedResponse(correlationId, {
        to: email,
        subject: `Confirm your subscription to ${scope}`,
        text,
        html,
        unsubscribeUrl: null,
      }),
    );
  }
}
