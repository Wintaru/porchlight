import { EMAIL_PATHS } from "../../../Common/EmailSite";
import type { IHandler } from "../../../Common/IHandler";
import { NOTIFICATION_KINDS } from "../../../Common/NotificationKind";
import { NOTIFICATION_SENTENCES } from "../../../Common/NotificationSentences";
import { type EmailBlock, renderEmail, unsubscribeLinks } from "../emailLayout";
import type { ComposeMemberEmailRequest } from "../Requests/ComposeMemberEmailRequest";
import { EmailComposedResponse } from "../Responses/EmailComposedResponse";

// A digest lists each kind once, with its count, in the bell's words: the bell holds
// the detail, and an email that named who replied to whom would put private threads
// in an inbox (D14). The queue email says how many items wait and links to the queue.
export class TransformComposeMemberEmailHandler implements IHandler<
  ComposeMemberEmailRequest,
  EmailComposedResponse
> {
  handle(request: ComposeMemberEmailRequest): Promise<EmailComposedResponse> {
    const { claim, site, correlationId } = request;
    const links = unsubscribeLinks(site, claim.unsubscribeToken);
    const footer: EmailBlock[] = [
      {
        text: "You get this email because you turned it on in your settings.",
        href: `${site.url}${EMAIL_PATHS.settings}`,
      },
      { text: "Stop all email from this site", href: links.page },
    ];

    let subject: string;
    let blocks: EmailBlock[];
    if (claim.kind === "queue") {
      const waiting = claim.counts["queue.pending"] ?? 0;
      subject =
        waiting === 1
          ? `1 item waits for review on ${site.name}`
          : `${String(waiting)} items wait for review on ${site.name}`;
      blocks = [
        { text: subject + "." },
        { text: "Open the moderation queue", href: `${site.url}${EMAIL_PATHS.queue}` },
      ];
    } else {
      subject = `What is new for you on ${site.name}`;
      blocks = [
        ...NOTIFICATION_KINDS.flatMap((kind) => {
          const count = claim.counts[kind] ?? 0;
          if (count === 0) {
            return [];
          }
          const sentence = NOTIFICATION_SENTENCES[kind];
          return [
            { text: count === 1 ? `${sentence}.` : `${sentence} (${String(count)}).` },
          ];
        }),
        { text: `Open ${site.name}`, href: site.url },
      ];
    }

    const { text, html } = renderEmail(blocks, footer);
    return Promise.resolve(
      new EmailComposedResponse(correlationId, {
        to: claim.email,
        subject,
        text,
        html,
        unsubscribeUrl: links.oneClick,
      }),
    );
  }
}
