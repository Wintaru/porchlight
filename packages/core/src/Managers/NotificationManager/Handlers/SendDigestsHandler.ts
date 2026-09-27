import type { IEmailAccessor } from "../../../Accessors/EmailAccessor/IEmailAccessor";
import { SendEmailsRequest } from "../../../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { EmailsSentResponse } from "../../../Accessors/EmailAccessor/Responses/EmailsSentResponse";
import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { ClaimMemberEmailsRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ClaimMemberEmailsRequest";
import { ReleaseMemberEmailRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ReleaseMemberEmailRequest";
import { MemberEmailsClaimedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailsClaimedResponse";
import { MemberEmailReleasedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailReleasedResponse";
import type { EmailMessage } from "../../../Common/EmailMessage";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IHandler } from "../../../Common/IHandler";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { IEmailComposeEngine } from "../../../Engines/EmailComposeEngine/IEmailComposeEngine";
import { ComposeMemberEmailRequest } from "../../../Engines/EmailComposeEngine/Requests/ComposeMemberEmailRequest";
import { EmailComposedResponse } from "../../../Engines/EmailComposeEngine/Responses/EmailComposedResponse";
import type { EmailOptions } from "../emailOptions";
import type { SendDigestsRequest } from "../Requests/SendDigestsRequest";
import { DigestsSentResponse } from "../Responses/DigestsSentResponse";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result = DigestsSentResponse | NotificationUnavailableResponse;

// A window ends this long before the sweep starts. A notification row is stamped when
// its transaction starts, so one still being written at the sweep's start could carry a
// time just inside a window that was already claimed. The lag leaves it to the next run.
const SETTLE_MS = 2 * 60 * 1000;
// One claim takes this many emails, and one run takes at most this many claims, so a
// run stays well inside a serverless function's time limit. What is left waits for the
// next run, a few minutes later.
const BATCH = 100;
const MAX_BATCHES = 5;

// Claim, compose, send; on a failed send, put every claimed window back so the next run
// tries again, and stop: the vendor is down or refusing, and more claims would fail too.
export class SendDigestsHandler implements IHandler<SendDigestsRequest, Result> {
  constructor(
    private readonly preferences: IEmailPreferenceAccessor,
    private readonly email: IEmailAccessor,
    private readonly compose: IEmailComposeEngine,
    private readonly options: EmailOptions,
  ) {}

  async handle(request: SendDigestsRequest): Promise<Result> {
    const { correlationId, site, timestamp } = request;
    const context = { correlationId, timestamp };
    if (!this.options.enabled) {
      return new DigestsSentResponse(correlationId, 0, 0);
    }
    const until = new Date(timestamp.getTime() - SETTLE_MS);
    let sent = 0;
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const claimed = await this.preferences.store(
        new ClaimMemberEmailsRequest(until, BATCH, context),
      );
      if (!(claimed instanceof MemberEmailsClaimedResponse)) {
        return unavailable(correlationId, claimed, "preferences.store");
      }
      const { claims } = claimed;
      if (claims.length === 0) {
        break;
      }
      const messages: EmailMessage[] = [];
      for (const claim of claims) {
        const composed = await this.compose.transform(
          new ComposeMemberEmailRequest(claim, site, context),
        );
        if (!(composed instanceof EmailComposedResponse)) {
          await this.releaseAll(claims, context);
          return unavailable(correlationId, composed, "compose.transform");
        }
        messages.push(composed.message);
      }
      const delivered = await this.email.store(new SendEmailsRequest(messages, context));
      if (!(delivered instanceof EmailsSentResponse)) {
        await this.releaseAll(claims, context);
        return new DigestsSentResponse(
          correlationId,
          sent,
          claims.length,
          reasonOf(delivered),
        );
      }
      sent += delivered.count;
    }
    return new DigestsSentResponse(correlationId, sent, 0);
  }

  // A release that fails leaves its window claimed: those notifications are not
  // emailed, though the bell still shows them. Logged, since nothing else can retry it.
  private async releaseAll(
    claims: readonly MemberEmailClaim[],
    context: RequestContext,
  ): Promise<void> {
    for (const claim of claims) {
      const released = await this.preferences.store(
        new ReleaseMemberEmailRequest(claim, context),
      );
      if (!(released instanceof MemberEmailReleasedResponse)) {
        console.error(
          `[email] could not put back a ${claim.kind} window: ${reasonOf(released)}`,
        );
      }
    }
  }
}

function reasonOf(response: ResponseBase): string {
  return "reason" in response && typeof response.reason === "string"
    ? response.reason
    : response.constructor.name;
}
