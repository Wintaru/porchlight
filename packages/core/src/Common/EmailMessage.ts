// One email as the EmailAccessor sends it (#22). `unsubscribeUrl` becomes the
// List-Unsubscribe header with one-click (RFC 8058) when set; a message the reader did
// not sign up for a list with, such as a subscription confirmation, has none.
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly unsubscribeUrl: string | null;
}
