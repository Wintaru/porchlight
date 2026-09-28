import type { EmailMessage } from "../../../Common/EmailMessage";
import type { IHandler } from "../../../Common/IHandler";
import type { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../Responses/EmailsSentResponse";
import { REAL_SEND_CLOCK, type SendClock } from "../SendClock";
import { unsubscribeHeaders } from "../unsubscribeHeaders";

const BATCH_URL = "https://api.resend.com/emails/batch";
// Resend takes at most 100 messages in one batch call.
const BATCH_SIZE = 100;
// The least time between two calls to Resend from this process: under two a second,
// Resend's old default limit and the lowest one an account can have. Supabase Auth
// mail can share the same account, so the sweep leaves room for it (#86).
const PACE_MS = 550;
// A refused call (429, 5xx, a network error, a timeout) is tried again at most this
// many times, and only when the retry starts within this long of the chunk's first
// try. With the timeout below, one chunk takes at most about nine seconds.
const MAX_RETRIES = 3;
const RETRY_WINDOW_MS = 5000;
// The wait before each retry when Resend names none (retry-after).
const BACKOFF_MS = [500, 1000, 2000] as const;
// One try gives up after this long. It is short enough that a timed-out first try
// still gets a retry inside the window, under the same Idempotency-Key: when Resend
// took the slow call, the retry gets its answer and nothing is sent twice.
const ATTEMPT_TIMEOUT_MS = 4000;
// Resend's answer when a call with the same Idempotency-Key is still running.
const CONCURRENT_KEY = "concurrent_idempotent_requests";

// One try's outcome: sent, a failure worth another try, or a final failure.
type Attempt =
  | { readonly kind: "sent" }
  | { readonly kind: "retry"; readonly reason: string; readonly waitMs: number | null }
  | { readonly kind: "failed"; readonly reason: string };

// Resend's batch endpoint (docs/setup/email.md). A batch is all or nothing on Resend's
// side: one invalid message fails the call. Each chunk of 100 carries its own
// Idempotency-Key, kept across its retries, so Resend sends a chunk at most once
// however many times it is tried. Calls are paced across the whole process, since the
// container keeps one handler for every request. A chunk that still fails ends the
// request, and the answer says how many messages went out before it.
export class ResendSendEmailsHandler implements IHandler<
  SendEmailsRequest,
  EmailsSentResponse | EmailAccessFailedResponse
> {
  // When the next call to Resend may start, on the clock's scale.
  private nextCallAt = 0;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly clock: SendClock = REAL_SEND_CLOCK,
  ) {}

  async handle(
    request: SendEmailsRequest,
  ): Promise<EmailsSentResponse | EmailAccessFailedResponse> {
    const { correlationId, messages } = request;
    for (let start = 0; start < messages.length; start += BATCH_SIZE) {
      const failure = await this.sendChunk(messages.slice(start, start + BATCH_SIZE));
      if (failure !== undefined) {
        return new EmailAccessFailedResponse(correlationId, failure, start);
      }
    }
    return new EmailsSentResponse(correlationId, messages.length);
  }

  // Answers the failure reason, or undefined when the chunk went out.
  private async sendChunk(chunk: readonly EmailMessage[]): Promise<string | undefined> {
    const idempotencyKey = crypto.randomUUID();
    const body = JSON.stringify(
      chunk.map((message) => ({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: unsubscribeHeaders(message),
      })),
    );
    const firstTry = this.clock.now();
    for (let retries = 0; ; retries += 1) {
      await this.waitForTurn();
      const attempt = await this.post(body, idempotencyKey);
      if (attempt.kind === "sent") {
        return undefined;
      }
      if (attempt.kind === "failed" || retries >= MAX_RETRIES) {
        return attempt.reason;
      }
      const waitMs = attempt.waitMs ?? BACKOFF_MS[retries] ?? RETRY_WINDOW_MS;
      if (this.clock.now() - firstTry + waitMs > RETRY_WINDOW_MS) {
        return attempt.reason;
      }
      await this.clock.sleep(waitMs);
    }
  }

  // Takes the next slot before it waits, so two sends at once queue one after another.
  private async waitForTurn(): Promise<void> {
    const now = this.clock.now();
    const at = Math.max(now, this.nextCallAt);
    this.nextCallAt = at + PACE_MS;
    if (at > now) {
      await this.clock.sleep(at - now);
    }
  }

  private async post(body: string, idempotencyKey: string): Promise<Attempt> {
    let response: Response;
    try {
      response = await fetch(BATCH_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      // Not reached, cut off, or timed out: Resend may have the call. The retry
      // carries the same key, so it cannot send the chunk a second time.
      const reason = error instanceof Error ? error.message : String(error);
      return { kind: "retry", reason, waitMs: null };
    }
    if (response.ok) {
      return { kind: "sent" };
    }
    // Resend's error body names the problem (a bad key, an unverified domain) and
    // never echoes the key or the recipients. The timeout still runs while it is read,
    // so a body that cannot be read leaves the status alone to decide.
    let text = "";
    try {
      text = await response.text();
    } catch (error: unknown) {
      text = `(no body: ${error instanceof Error ? error.message : String(error)})`;
    }
    const reason = `resend answered ${String(response.status)}: ${text.slice(0, 300)}`;
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      (response.status === 409 && text.includes(CONCURRENT_KEY));
    if (!retryable) {
      return { kind: "failed", reason };
    }
    return { kind: "retry", reason, waitMs: retryAfterMs(response) };
  }
}

// Resend's retry-after header is a number of seconds. Anything else counts as absent.
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (header === null) {
    return null;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}
