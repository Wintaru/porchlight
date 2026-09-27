// Who an email is from and where its links go (#22). `url` is the deployment's public
// origin with no trailing slash; the Client passes it, since only it reads the site URL.
export interface EmailSite {
  readonly name: string;
  readonly url: string;
}

// The pages an email links to. The Client serves each one at this path.
export const EMAIL_PATHS = {
  settings: "/settings",
  queue: "/mod/queue",
  // The page a reader opens from the email body: it asks before it unsubscribes, so a
  // mail scanner that opens every link cannot unsubscribe anyone.
  unsubscribePage: "/email/unsubscribe",
  // The List-Unsubscribe header's target: a mail client POSTs to it in one click
  // (RFC 8058).
  unsubscribeOneClick: "/api/email/unsubscribe",
  confirmPage: "/email/confirm",
} as const;
