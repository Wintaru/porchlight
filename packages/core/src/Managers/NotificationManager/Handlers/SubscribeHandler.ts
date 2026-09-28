import type { IEmailAccessor } from "../../../Accessors/EmailAccessor/IEmailAccessor";
import { SendEmailsRequest } from "../../../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { EmailsSentResponse } from "../../../Accessors/EmailAccessor/Responses/EmailsSentResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { IRateLimitAccessor } from "../../../Accessors/RateLimitAccessor/IRateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { RateLimitBumpedResponse } from "../../../Accessors/RateLimitAccessor/Responses/RateLimitBumpedResponse";
import type { ISubscriberAccessor } from "../../../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { RemovePendingSubscriptionRequest } from "../../../Accessors/SubscriberAccessor/Requests/RemovePendingSubscriptionRequest";
import { StorePendingSubscriptionRequest } from "../../../Accessors/SubscriberAccessor/Requests/StorePendingSubscriptionRequest";
import { SubscriberRemovedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberRemovedResponse";
import { SubscriptionAskedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriptionAskedResponse";
import type { ITurnstileAccessor } from "../../../Accessors/TurnstileAccessor/ITurnstileAccessor";
import { VerifyTurnstileRequest } from "../../../Accessors/TurnstileAccessor/Requests/VerifyTurnstileRequest";
import { TurnstileVerifiedResponse } from "../../../Accessors/TurnstileAccessor/Responses/TurnstileVerifiedResponse";
import type { AfterResponse } from "../../../Common/AfterResponse";
import type { DigestSchedule } from "../../../Common/DigestSchedule";
import type { EmailSite } from "../../../Common/EmailSite";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import { UNTRUSTED_CLIENT_IP } from "../../../Common/Retention";
import type { IEmailComposeEngine } from "../../../Engines/EmailComposeEngine/IEmailComposeEngine";
import { ComposeSubscriptionConfirmationRequest } from "../../../Engines/EmailComposeEngine/Requests/ComposeSubscriptionConfirmationRequest";
import { EmailComposedResponse } from "../../../Engines/EmailComposeEngine/Responses/EmailComposedResponse";
import { generateAnonymousSecret } from "../../../Utilities/anonymous/generateAnonymousSecret";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { sha256Hex } from "../../../Utilities/anonymous/sha256Hex";
import type { SubscribeRequest } from "../Requests/SubscribeRequest";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { SubscribeRejectedResponse } from "../Responses/SubscribeRejectedResponse";
import { SubscriptionRequestedResponse } from "../Responses/SubscriptionRequestedResponse";
import type { SubscribeOptions } from "../subscribeOptions";
import { unavailable } from "../unavailable";

type Result =
  | SubscriptionRequestedResponse
  | SubscribeRejectedResponse
  | NotificationUnavailableResponse;

type Ctx = Required<Pick<RequestContext, "correlationId" | "timestamp">>;

// The longest address SMTP carries (RFC 5321), and a shape check that only keeps out
// what cannot be an address: the confirmation email is the real test.
const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Per hour. The address limit stops one inbox being flooded from many places; the
// database also holds a repeat for ten minutes. The IP limit applies only behind a
// trusted proxy: without one every visitor shares one placeholder address.
const PER_EMAIL_PER_HOUR = 5;
const PER_IP_PER_HOUR = 10;
const MS_PER_HOUR = 3_600_000;

// What the confirmation email needs, fixed before the response goes out.
interface Confirmation {
  readonly email: string;
  readonly confirmToken: string;
  readonly authorHandle: string | null;
  readonly digest: Exclude<DigestSchedule, "off">;
  readonly site: EmailSite;
  readonly context: Ctx;
}

// Turnstile, then the limits, then the author, then the store and the opt-in email
// (#22, D20). Every accepted request answers the same, whatever the store found. The
// email goes out after the response (#84): a new address and a subscribed one then
// answer in the same time, and a mail vendor that is down still shows "check your
// email". A failed send removes the pending row, so the reader can ask again at once
// (#86, C4 A); the failure goes to the log.
export class SubscribeHandler implements IHandler<SubscribeRequest, Result> {
  constructor(
    private readonly subscribers: ISubscriberAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly turnstile: ITurnstileAccessor,
    private readonly rateLimits: IRateLimitAccessor,
    private readonly email: IEmailAccessor,
    private readonly compose: IEmailComposeEngine,
    private readonly options: SubscribeOptions,
    private readonly afterResponse: AfterResponse,
  ) {}

  async handle(request: SubscribeRequest): Promise<Result> {
    const { correlationId, timestamp, authorId, digest, origin, site } = request;
    const context: Ctx = { correlationId, timestamp };
    if (!this.options.enabled) {
      return new SubscribeRejectedResponse(correlationId, "email-off");
    }
    const email = request.email.trim().toLowerCase();
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email) || digest === "off") {
      return new SubscribeRejectedResponse(correlationId, "invalid");
    }

    const verified = await this.turnstile.load(
      new VerifyTurnstileRequest(request.turnstileToken, origin.clientIp, context),
    );
    if (!(verified instanceof TurnstileVerifiedResponse)) {
      return unavailable(correlationId, verified, "turnstile.load");
    }
    if (!verified.passed) {
      return new SubscribeRejectedResponse(correlationId, "turnstile-failed");
    }

    const limited = await this.overLimit(email, origin.clientIp, context);
    if (limited !== false) {
      return limited === true
        ? new SubscribeRejectedResponse(correlationId, "rate-limited")
        : limited;
    }

    let authorHandle: string | null = null;
    if (authorId !== null) {
      const author = await this.profiles.load(
        new LoadProfileByIdRequest(authorId, context),
      );
      if (author instanceof ProfileNotFoundResponse) {
        return new SubscribeRejectedResponse(correlationId, "no-such-author");
      }
      if (!(author instanceof ProfileLoadedResponse)) {
        return unavailable(correlationId, author, "profiles.load");
      }
      if (author.profile.status !== "active") {
        return new SubscribeRejectedResponse(correlationId, "no-such-author");
      }
      // The handle only, never the display name (#84): this email goes to any address
      // a stranger types, and a member can put anything in their name.
      authorHandle = author.profile.handle;
    }

    const confirmToken = generateAnonymousSecret();
    const asked = await this.subscribers.store(
      new StorePendingSubscriptionRequest(email, authorId, digest, confirmToken, context),
    );
    if (!(asked instanceof SubscriptionAskedResponse)) {
      return unavailable(correlationId, asked, "subscribers.store");
    }
    if (asked.outcome !== "pending") {
      return new SubscriptionRequestedResponse(correlationId);
    }

    const confirmation: Confirmation = {
      email,
      confirmToken,
      authorHandle,
      digest,
      site,
      context,
    };
    await this.afterResponse(() => this.sendConfirmation(confirmation));
    return new SubscriptionRequestedResponse(correlationId);
  }

  // Never throws: it runs after the response, where nobody would catch it. A vendor
  // that times out after it took the message still counts as a failure, so the reader
  // can get a link whose row is gone. That is the known cost of C4 A: they ask again.
  private async sendConfirmation(confirmation: Confirmation): Promise<void> {
    const { email, confirmToken, authorHandle, digest, site, context } = confirmation;
    const { correlationId } = context;
    try {
      const composed = await this.compose.transform(
        new ComposeSubscriptionConfirmationRequest(
          email,
          confirmToken,
          authorHandle,
          digest,
          site,
          context,
        ),
      );
      const sent =
        composed instanceof EmailComposedResponse
          ? await this.email.store(new SendEmailsRequest([composed.message], context))
          : composed;
      if (sent instanceof EmailsSentResponse) {
        return;
      }
      console.error(
        `[subscribe] the confirmation email did not go out [${correlationId}]: ${unavailable(correlationId, sent, "the confirmation send").reason}`,
      );
    } catch (error: unknown) {
      console.error(
        `[subscribe] the confirmation email did not go out [${correlationId}]`,
        error,
      );
    }
    await this.releasePending(confirmToken, context);
  }

  private async releasePending(confirmToken: string, context: Ctx): Promise<void> {
    try {
      const released = await this.subscribers.remove(
        new RemovePendingSubscriptionRequest(confirmToken, context),
      );
      if (!(released instanceof SubscriberRemovedResponse)) {
        console.error(
          `[subscribe] could not release the pending subscription [${context.correlationId}]: ${unavailable(context.correlationId, released, "subscribers.remove").reason}`,
        );
      }
    } catch (error: unknown) {
      console.error(
        `[subscribe] could not release the pending subscription [${context.correlationId}]`,
        error,
      );
    }
  }

  private async overLimit(
    email: string,
    clientIp: string,
    context: Ctx,
  ): Promise<boolean | NotificationUnavailableResponse> {
    const windowStart = new Date(
      Math.floor(context.timestamp.getTime() / MS_PER_HOUR) * MS_PER_HOUR,
    );
    const checks: [string, number][] = [
      [
        `email:${await sha256Hex(`${this.options.ipHashSalt}:${email}`)}`,
        PER_EMAIL_PER_HOUR,
      ],
    ];
    if (clientIp !== UNTRUSTED_CLIENT_IP) {
      checks.push([
        `ip:${await hashIp(this.options.ipHashSalt, clientIp)}`,
        PER_IP_PER_HOUR,
      ]);
    }
    for (const [subject, limit] of checks) {
      const bumped = await this.rateLimits.store(
        new BumpRateLimitRequest(subject, "email.subscribe", windowStart, context),
      );
      if (!(bumped instanceof RateLimitBumpedResponse)) {
        return unavailable(context.correlationId, bumped, "rateLimits.store");
      }
      if (bumped.count > limit) {
        return true;
      }
    }
    return false;
  }
}
