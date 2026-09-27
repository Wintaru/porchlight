import type { EmailMessage } from "../../Common/EmailMessage";

// The fake's outbox. `sent` is what a unit test reads back. `mailpitUrl`, when set,
// also delivers each message to the local stack's mail catcher (supabase/config.toml),
// so a developer reads it at that address and a Playwright test reads it through the
// catcher's API, the same way the sign-in emails are read. `failing` makes every send
// answer EmailAccessFailedResponse, for the error path.
export class FakeEmailState {
  readonly sent: EmailMessage[] = [];

  constructor(
    readonly from: string,
    readonly mailpitUrl: string | null = null,
    readonly failing = false,
  ) {}
}
