import type { EmailMessage } from "../../Common/EmailMessage";

// The two headers that let a mail client show its own Unsubscribe button and send one
// POST to the link (RFC 2369, RFC 8058). Gmail and Yahoo require both for bulk senders.
export function unsubscribeHeaders(
  message: EmailMessage,
): Readonly<Record<string, string>> {
  if (message.unsubscribeUrl === null) {
    return {};
  }
  return {
    "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
