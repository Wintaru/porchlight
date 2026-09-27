import type { IEmailAccessor } from "../../../Accessors/EmailAccessor/IEmailAccessor";
import { SendEmailsRequest } from "../../../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { EmailsSentResponse } from "../../../Accessors/EmailAccessor/Responses/EmailsSentResponse";
import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { ClaimMemberEmailsRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ClaimMemberEmailsRequest";
import { ReleaseMemberEmailRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/ReleaseMemberEmailRequest";
import { MemberEmailReleasedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailReleasedResponse";
import { MemberEmailsClaimedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberEmailsClaimedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadAnnouncedPostsRequest } from "../../../Accessors/PostAccessor/Requests/LoadAnnouncedPostsRequest";
import { AnnouncedPostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/AnnouncedPostsLoadedResponse";
import type { ISubscriberAccessor } from "../../../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { ClaimSubscriberEmailsRequest } from "../../../Accessors/SubscriberAccessor/Requests/ClaimSubscriberEmailsRequest";
import { ReleaseSubscriberEmailRequest } from "../../../Accessors/SubscriberAccessor/Requests/ReleaseSubscriberEmailRequest";
import { SubscriberEmailReleasedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberEmailReleasedResponse";
import { SubscriberEmailsClaimedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberEmailsClaimedResponse";
import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import type { EmailMessage } from "../../../Common/EmailMessage";
import type { EmailSite } from "../../../Common/EmailSite";
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
// The most posts one batch of reader emails can list. A site that announces more than
// this between two runs of a daily digest sends the oldest ones.
const MAX_POSTS = 200;

// One batch's outcome: how many went out, or the failure that stops the run. A failed
// send has already put its windows back.
type BatchOutcome =
  | { readonly kind: "sent"; readonly count: number }
  | { readonly kind: "send-failed"; readonly failed: number; readonly reason: string }
  | { readonly kind: "unavailable"; readonly response: NotificationUnavailableResponse };

// Members first, then readers. Each batch: claim, compose, send; on a failed send, put
// every claimed window back so the next run tries again, and stop: the vendor is down
// or refusing, and more claims would fail too.
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
    let sent = 0;
    const passes = [
      () => this.memberBatch(until, site, context),
      () => this.subscriberBatch(until, site, context),
    ];
    for (const pass of passes) {
      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const outcome = await pass();
        if (outcome.kind === "unavailable") {
          return outcome.response;
        }
        if (outcome.kind === "send-failed") {
          return new DigestsSentResponse(
            correlationId,
            sent,
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
    const release = async () => {
      for (const claim of claims) {
        const released = await this.preferences.store(
          new ReleaseMemberEmailRequest(claim, context),
        );
        if (!(released instanceof MemberEmailReleasedResponse)) {
          logLostRelease(`${claim.kind} window`, released);
        }
      }
    };
    const messages: EmailMessage[] = [];
    for (const claim of claims) {
      const composed = await this.compose.transform(
        new ComposeMemberEmailRequest(claim, site, context),
      );
      if (!(composed instanceof EmailComposedResponse)) {
        await release();
        return failure(context, composed, "compose.transform");
      }
      messages.push(composed.message);
    }
    return this.send(messages, release, context);
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
    const release = async () => {
      for (const claim of claims) {
        const released = await this.subscribers.store(
          new ReleaseSubscriberEmailRequest(claim, context),
        );
        if (!(released instanceof SubscriberEmailReleasedResponse)) {
          logLostRelease("reader window", released);
        }
      }
    };
    // One read for the whole batch: the posts from the earliest window's start.
    const since = new Date(
      Math.min(...claims.map((claim) => claim.windowStart.getTime())),
    );
    const loaded = await this.posts.load(
      new LoadAnnouncedPostsRequest(since, until, MAX_POSTS, context),
    );
    if (!(loaded instanceof AnnouncedPostsLoadedResponse)) {
      await release();
      return failure(context, loaded, "posts.load");
    }
    const messages: EmailMessage[] = [];
    for (const claim of claims) {
      const posts = postsFor(claim, loaded.posts);
      // The claim saw a post, but it is past MAX_POSTS: nothing to list this time.
      if (posts.length === 0) {
        continue;
      }
      const composed = await this.compose.transform(
        new ComposeSubscriberDigestRequest(claim, posts, site, context),
      );
      if (!(composed instanceof EmailComposedResponse)) {
        await release();
        return failure(context, composed, "compose.transform");
      }
      messages.push(composed.message);
    }
    return this.send(messages, release, context);
  }

  private async send(
    messages: readonly EmailMessage[],
    release: () => Promise<void>,
    context: Ctx,
  ): Promise<BatchOutcome> {
    // Nothing claimed, or nothing to say: zero ends the pass.
    if (messages.length === 0) {
      return { kind: "sent", count: 0 };
    }
    const delivered = await this.email.store(new SendEmailsRequest(messages, context));
    if (!(delivered instanceof EmailsSentResponse)) {
      await release();
      return {
        kind: "send-failed",
        failed: messages.length,
        reason: reasonOf(delivered),
      };
    }
    return { kind: "sent", count: delivered.count };
  }
}

function postsFor(
  claim: SubscriberEmailClaim,
  posts: readonly AnnouncedPost[],
): AnnouncedPost[] {
  return posts.filter(
    (post) =>
      post.announcedAt > claim.windowStart &&
      post.announcedAt <= claim.windowEnd &&
      (claim.authorId === null || post.authorId === claim.authorId),
  );
}

function failure(context: Ctx, response: ResponseBase, method: string): BatchOutcome {
  return {
    kind: "unavailable",
    response: unavailable(context.correlationId, response, method),
  };
}

// A release that fails leaves its window claimed: those items are not emailed, though
// the bell and the site still show them. Logged, since nothing else can retry it.
function logLostRelease(what: string, response: ResponseBase): void {
  console.error(`[email] could not put back a ${what}: ${reasonOf(response)}`);
}

function reasonOf(response: ResponseBase): string {
  return "reason" in response && typeof response.reason === "string"
    ? response.reason
    : response.constructor.name;
}
