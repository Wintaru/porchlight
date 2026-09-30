import type { IEmailAccessor } from "../../../Accessors/EmailAccessor/IEmailAccessor";
import { SendEmailsRequest } from "../../../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../../../Accessors/EmailAccessor/Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../../../Accessors/EmailAccessor/Responses/EmailsSentResponse";
import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { ClaimMemberEmailsRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ClaimMemberEmailsRequest";
import { ReleaseMemberEmailsRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ReleaseMemberEmailsRequest";
import { MemberEmailsReleasedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailsReleasedResponse";
import { MemberEmailsClaimedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailsClaimedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadAnnouncedPostsRequest } from "../../../Accessors/PostAccessor/Requests/LoadAnnouncedPostsRequest";
import { AnnouncedPostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/AnnouncedPostsLoadedResponse";
import type { ISubscriberAccessor } from "../../../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { ClaimSubscriberEmailsRequest } from "../../../Accessors/SubscriberAccessor/Requests/ClaimSubscriberEmailsRequest";
import { ReleaseSubscriberEmailsRequest } from "../../../Accessors/SubscriberAccessor/Requests/ReleaseSubscriberEmailsRequest";
import { SubscriberEmailsReleasedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberEmailsReleasedResponse";
import { SubscriberEmailsClaimedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberEmailsClaimedResponse";
import type { EmailMessage } from "../../../Common/EmailMessage";
import type { EmailSite } from "../../../Common/EmailSite";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import type { IEmailComposeEngine } from "../../../Engines/EmailComposeEngine/IEmailComposeEngine";
import { ComposeMemberEmailRequest } from "../../../Engines/EmailComposeEngine/Requests/ComposeMemberEmailRequest";
import { ComposeSubscriberDigestRequest } from "../../../Engines/EmailComposeEngine/Requests/ComposeSubscriberDigestRequest";
import { EmailComposedResponse } from "../../../Engines/EmailComposeEngine/Responses/EmailComposedResponse";
import type { EmailOptions } from "../emailOptions";
import type { SendDigestsRequest } from "../Requests/SendDigestsRequest";
import { DigestsSentResponse } from "../Responses/DigestsSentResponse";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";
import { chunked } from "../../../Utilities/collections/chunked";

type Result = DigestsSentResponse | NotificationUnavailableResponse;
type Ctx = Required<Pick<RequestContext, "correlationId" | "timestamp">>;

// A window ends this long before the sweep starts. A notification row is stamped when
// its transaction starts, so one still being written at the sweep's start could carry a
// time just inside a window that was already claimed. The lag leaves it to the next run.
const SETTLE_MS = 2 * 60 * 1000;
// One claim takes this many emails, and one run takes at most this many claims of each
// kind, so a run stays well inside a serverless function's time limit. What is left
// waits for the next run, a few minutes later.
const BATCH = 100;
const MAX_BATCHES = 5;
// No new batch is claimed once a run is this old. Calls to Resend are paced and can be
// retried (#86), so ten batches could pass the route's 60-second limit. A run stopped
// by the host mid-send would leave its claimed windows neither sent nor put back. A
// batch started just before this line ends within about ten seconds.
const RUN_BUDGET_MS = 30_000;
// The most posts one reader email lists, oldest first. A window with more ends with a
// link to the site for the rest.
const POSTS_PER_EMAIL = 20;
// Post reads in flight at once while a batch of readers is composed.
const LOADS_AT_ONCE = 10;

// One batch's outcome: how many went out, or the failure that stops the run. A failed
// send has already put back the windows of the emails that did not go out.
type BatchOutcome =
  | { readonly kind: "sent"; readonly count: number }
  | {
      readonly kind: "send-failed";
      readonly sent: number;
      readonly failed: number;
      readonly reason: string;
    }
  | { readonly kind: "unavailable"; readonly response: NotificationUnavailableResponse };

// One email and the claim it answers, so a failed send can put back exactly the
// claims whose emails did not go out.
interface Outgoing<C> {
  readonly message: EmailMessage;
  readonly claim: C;
}

// Members first, then readers. Each batch: claim, compose, send; on a failed send, put
// back the windows of every email that did not go out, in one call, so the next run
// tries those again, and stop: the vendor is down or refusing, and more claims would
// fail too. The emails that did go out keep their claims, so nobody gets one twice.
export class SendDigestsHandler implements IHandler<SendDigestsRequest, Result> {
  constructor(
    private readonly preferences: IEmailPreferenceAccessor,
    private readonly subscribers: ISubscriberAccessor,
    private readonly posts: IPostAccessor,
    private readonly email: IEmailAccessor,
    private readonly compose: IEmailComposeEngine,
    private readonly options: EmailOptions,
  ) {}

  async handle(request: SendDigestsRequest): Promise<Result> {
    const { correlationId, site, timestamp } = request;
    const context: Ctx = { correlationId, timestamp };
    if (!this.options.enabled) {
      return new DigestsSentResponse(correlationId, 0, 0);
    }
    const until = new Date(timestamp.getTime() - SETTLE_MS);
    const started = Date.now();
    let sent = 0;
    const passes = [
      () => this.memberBatch(until, site, context),
      () => this.subscriberBatch(until, site, context),
    ];
    for (const pass of passes) {
      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        // What is left waits for the next run, a few minutes later.
        if (Date.now() - started > RUN_BUDGET_MS) {
          return new DigestsSentResponse(correlationId, sent, 0);
        }
        const outcome = await pass();
        if (outcome.kind === "unavailable") {
          return outcome.response;
        }
        if (outcome.kind === "send-failed") {
          return new DigestsSentResponse(
            correlationId,
            sent + outcome.sent,
            outcome.failed,
            outcome.reason,
          );
        }
        if (outcome.count === 0) {
          break;
        }
        sent += outcome.count;
      }
    }
    return new DigestsSentResponse(correlationId, sent, 0);
  }

  // A batch that claims nothing reports zero sent, which ends its pass.
  private async memberBatch(
    until: Date,
    site: EmailSite,
    context: Ctx,
  ): Promise<BatchOutcome> {
    const claimed = await this.preferences.store(
      new ClaimMemberEmailsRequest(until, BATCH, context),
    );
    if (!(claimed instanceof MemberEmailsClaimedResponse)) {
      return failure(context, claimed, "preferences.store");
    }
    const { claims } = claimed;
    const release = async (back: readonly MemberEmailClaim[]) => {
      const released = await this.preferences.store(
        new ReleaseMemberEmailsRequest(back, context),
      );
      if (!(released instanceof MemberEmailsReleasedResponse)) {
        logLostRelease(back.length, "member", released);
      }
    };
    const outgoing: Outgoing<MemberEmailClaim>[] = [];
    for (const claim of claims) {
      const composed = await this.compose.transform(
        new ComposeMemberEmailRequest(claim, site, context),
      );
      if (!(composed instanceof EmailComposedResponse)) {
        await release(claims);
        return failure(context, composed, "compose.transform");
      }
      outgoing.push({ message: composed.message, claim });
    }
    return this.send(outgoing, release, context);
  }

  private async subscriberBatch(
    until: Date,
    site: EmailSite,
    context: Ctx,
  ): Promise<BatchOutcome> {
    const claimed = await this.subscribers.store(
      new ClaimSubscriberEmailsRequest(until, BATCH, context),
    );
    if (!(claimed instanceof SubscriberEmailsClaimedResponse)) {
      return failure(context, claimed, "subscribers.store");
    }
    const { claims } = claimed;
    if (claims.length === 0) {
      return { kind: "sent", count: 0 };
    }
    const release = async (back: readonly SubscriberEmailClaim[]) => {
      const released = await this.subscribers.store(
        new ReleaseSubscriberEmailsRequest(back, context),
      );
      if (!(released instanceof SubscriberEmailsReleasedResponse)) {
        logLostRelease(back.length, "reader", released);
      }
    };
    // One read per scope and window, not one for the whole batch: a reader of a quiet
    // author can have a window months long, and a site-wide read from its start would
    // crowd out every other reader's posts. Readers who share a scope and a window
    // share the read. Windows start at each reader's last email, so most claims need a
    // read of their own: they run LOADS_AT_ONCE at a time, not one after another.
    const loads = new Map<string, Promise<ResponseBase>>();
    const loadFor = (claim: SubscriberEmailClaim): Promise<ResponseBase> => {
      const key = `${claim.authorId ?? "site"}|${claim.windowStart.toISOString()}`;
      let load = loads.get(key);
      if (load === undefined) {
        load = this.posts.load(
          new LoadAnnouncedPostsRequest(
            claim.windowStart,
            claim.windowEnd,
            claim.authorId,
            POSTS_PER_EMAIL + 1,
            context,
          ),
        );
        loads.set(key, load);
      }
      return load;
    };
    for (const run of chunked(claims, LOADS_AT_ONCE)) {
      await Promise.all(run.map(loadFor));
    }
    const outgoing: Outgoing<SubscriberEmailClaim>[] = [];
    for (const claim of claims) {
      const loaded = await loadFor(claim);
      if (!(loaded instanceof AnnouncedPostsLoadedResponse)) {
        await release(claims);
        return failure(context, loaded, "posts.load");
      }
      // The claim saw a post; one unpublished since leaves nothing to say.
      if (loaded.posts.length === 0) {
        continue;
      }
      const composed = await this.compose.transform(
        new ComposeSubscriberDigestRequest(
          claim,
          loaded.posts.slice(0, POSTS_PER_EMAIL),
          loaded.posts.length > POSTS_PER_EMAIL,
          site,
          context,
        ),
      );
      if (!(composed instanceof EmailComposedResponse)) {
        await release(claims);
        return failure(context, composed, "compose.transform");
      }
      outgoing.push({ message: composed.message, claim });
    }
    return this.send(outgoing, release, context);
  }

  // A claim with nothing to say sent no email and stays claimed: it is done.
  private async send<C>(
    outgoing: readonly Outgoing<C>[],
    release: (back: readonly C[]) => Promise<void>,
    context: Ctx,
  ): Promise<BatchOutcome> {
    // Nothing claimed, or nothing to say: zero ends the pass.
    if (outgoing.length === 0) {
      return { kind: "sent", count: 0 };
    }
    const delivered = await this.email.store(
      new SendEmailsRequest(
        outgoing.map((item) => item.message),
        context,
      ),
    );
    if (!(delivered instanceof EmailsSentResponse)) {
      // The emails before `sent` went out; only the ones after it go back.
      const sent = delivered instanceof EmailAccessFailedResponse ? delivered.sent : 0;
      await release(outgoing.slice(sent).map((item) => item.claim));
      return {
        kind: "send-failed",
        sent,
        failed: outgoing.length - sent,
        reason: reasonOf(delivered),
      };
    }
    return { kind: "sent", count: delivered.count };
  }
}

function failure(context: Ctx, response: ResponseBase, method: string): BatchOutcome {
  return {
    kind: "unavailable",
    response: unavailable(context.correlationId, response, method),
  };
}

// A release that fails leaves its windows claimed: those items are not emailed, though
// the bell and the site still show them. Logged, since nothing else can retry it.
function logLostRelease(count: number, who: string, response: ResponseBase): void {
  console.error(
    `[email] could not put back ${String(count)} ${who} windows: ${reasonOf(response)}`,
  );
}

function reasonOf(response: ResponseBase): string {
  return "reason" in response && typeof response.reason === "string"
    ? response.reason
    : response.constructor.name;
}
