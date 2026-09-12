import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { LoadAnonymousAuthorBySecretHashRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorBySecretHashRequest";
import { StoreNewAnonymousAuthorRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/StoreNewAnonymousAuthorRequest";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorNotFoundResponse";
import { AnonymousAuthorStoredResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorStoredResponse";
import type { IBlockAccessor } from "../../../Accessors/BlockAccessor/IBlockAccessor";
import { CheckAnonymousBlockRequest } from "../../../Accessors/BlockAccessor/Requests/CheckAnonymousBlockRequest";
import { AnonymousBlockedResponse } from "../../../Accessors/BlockAccessor/Responses/AnonymousBlockedResponse";
import { AnonymousNotBlockedResponse } from "../../../Accessors/BlockAccessor/Responses/AnonymousNotBlockedResponse";
import type { IRateLimitAccessor } from "../../../Accessors/RateLimitAccessor/IRateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { RateLimitBumpedResponse } from "../../../Accessors/RateLimitAccessor/Responses/RateLimitBumpedResponse";
import type { ITurnstileAccessor } from "../../../Accessors/TurnstileAccessor/ITurnstileAccessor";
import { VerifyTurnstileRequest } from "../../../Accessors/TurnstileAccessor/Requests/VerifyTurnstileRequest";
import { TurnstileVerifiedResponse } from "../../../Accessors/TurnstileAccessor/Responses/TurnstileVerifiedResponse";
import type { AnonymousAuthor } from "../../../Common/AnonymousAuthor";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import { generateAnonymousSecret } from "../../../Utilities/anonymous/generateAnonymousSecret";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { sha256Hex } from "../../../Utilities/anonymous/sha256Hex";
import type { AnonymousGuardOptions } from "../AnonymousGuardOptions";
import type { AdmitAnonymousSubmissionRequest } from "../Requests/AdmitAnonymousSubmissionRequest";
import { AnonymousAdmittedResponse } from "../Responses/AnonymousAdmittedResponse";
import { AnonymousGuardDeniedResponse } from "../Responses/AnonymousGuardDeniedResponse";
import { AnonymousGuardUnavailableResponse } from "../Responses/AnonymousGuardUnavailableResponse";
import { unavailable } from "../unavailable";

type AdmitResult =
  | AnonymousAdmittedResponse
  | AnonymousGuardDeniedResponse
  | AnonymousGuardUnavailableResponse;

// Every request this handler passes downstream carries the same id and clock, always
// defined (RequestBase defaults both), so the private steps below take the narrow
// shape instead of the optional one RequestContext allows a caller.
type Ctx = Required<Pick<RequestContext, "correlationId" | "timestamp">>;

// An author found by an existing cookie, with the secret that found it (so the
// response can hand the same cookie value back without re-deriving it).
interface ExistingAuthor {
  readonly author: AnonymousAuthor;
  readonly secret: string;
}

const MS_PER_HOUR = 3_600_000;

// The D15 sequence, fixed order (SPEC.md Sec4): Turnstile first, so a failed challenge
// never touches a store; then identity, so the block and rate-limit checks below know
// who is asking; then the block list; then the two rate limits; a first write creates
// the author only after every guard has passed.
export class EvaluateAdmitAnonymousSubmissionHandler implements IHandler<
  AdmitAnonymousSubmissionRequest,
  AdmitResult
> {
  constructor(
    private readonly turnstile: ITurnstileAccessor,
    private readonly authors: IAnonymousAuthorAccessor,
    private readonly blocks: IBlockAccessor,
    private readonly rateLimits: IRateLimitAccessor,
    private readonly options: AnonymousGuardOptions,
  ) {}

  async handle(request: AdmitAnonymousSubmissionRequest): Promise<AdmitResult> {
    const { correlationId, action, submission, timestamp } = request;
    const context: Ctx = { correlationId, timestamp };

    const verified = await this.turnstile.load(
      new VerifyTurnstileRequest(submission.turnstileToken, submission.clientIp, context),
    );
    if (!(verified instanceof TurnstileVerifiedResponse)) {
      return unavailable(correlationId, verified, "turnstile.load");
    }
    if (!verified.passed) {
      return new AnonymousGuardDeniedResponse(correlationId, "turnstile-failed");
    }

    const ipHash = await hashIp(this.options.ipHashSalt, submission.clientIp);
    const existing = await this.loadExisting(submission.secret, context);
    if (existing instanceof AnonymousGuardUnavailableResponse) {
      return existing;
    }

    const blocked = await this.blocks.load(
      new CheckAnonymousBlockRequest(existing?.author.id, ipHash, context),
    );
    if (blocked instanceof AnonymousBlockedResponse) {
      return new AnonymousGuardDeniedResponse(correlationId, "blocked");
    }
    if (!(blocked instanceof AnonymousNotBlockedResponse)) {
      return unavailable(correlationId, blocked, "blocks.load");
    }

    const rateLimited = await this.overLimit(
      action,
      ipHash,
      existing?.author.id,
      context,
    );
    if (rateLimited instanceof AnonymousGuardUnavailableResponse) {
      return rateLimited;
    }
    if (rateLimited) {
      return new AnonymousGuardDeniedResponse(correlationId, "rate-limited");
    }

    if (existing !== undefined) {
      return new AnonymousAdmittedResponse(
        correlationId,
        existing.author,
        existing.secret,
        false,
      );
    }

    const secret = generateAnonymousSecret();
    const stored = await this.authors.store(
      new StoreNewAnonymousAuthorRequest(await sha256Hex(secret), ipHash, context),
    );
    if (!(stored instanceof AnonymousAuthorStoredResponse)) {
      return unavailable(correlationId, stored, "authors.store");
    }
    return new AnonymousAdmittedResponse(correlationId, stored.author, secret, true);
  }

  // The author behind a cookie, or undefined for a first write and for a stale cookie
  // that names no row (cleared server-side, or a foreign value): both are treated the
  // same as "nobody yet," so a lost cookie degrades to a fresh identity instead of an
  // error.
  private async loadExisting(
    secret: string | undefined,
    context: Ctx,
  ): Promise<ExistingAuthor | undefined | AnonymousGuardUnavailableResponse> {
    if (secret === undefined) {
      return undefined;
    }
    const loaded = await this.authors.load(
      new LoadAnonymousAuthorBySecretHashRequest(await sha256Hex(secret), context),
    );
    if (loaded instanceof AnonymousAuthorLoadedResponse) {
      return { author: loaded.author, secret };
    }
    if (loaded instanceof AnonymousAuthorNotFoundResponse) {
      return undefined;
    }
    return unavailable(context.correlationId, loaded, "authors.load");
  }

  // Bumps the IP counter always, and the token counter once an author exists: a first
  // write has no token yet, so only the address can be over the cap.
  private async overLimit(
    action: string,
    ipHash: string,
    existingAuthorId: string | undefined,
    context: Ctx,
  ): Promise<boolean | AnonymousGuardUnavailableResponse> {
    const windowStart = floorToHour(context.timestamp);
    const byIp = await this.rateLimits.store(
      new BumpRateLimitRequest(
        `ip:${ipHash}`,
        `anonymous.${action}`,
        windowStart,
        context,
      ),
    );
    if (!(byIp instanceof RateLimitBumpedResponse)) {
      return unavailable(context.correlationId, byIp, "rateLimits.store");
    }
    if (byIp.count > this.options.perIpPerHour) {
      return true;
    }
    if (existingAuthorId === undefined) {
      return false;
    }
    const byToken = await this.rateLimits.store(
      new BumpRateLimitRequest(
        `anon:${existingAuthorId}`,
        `anonymous.${action}`,
        windowStart,
        context,
      ),
    );
    if (!(byToken instanceof RateLimitBumpedResponse)) {
      return unavailable(context.correlationId, byToken, "rateLimits.store");
    }
    return byToken.count > this.options.perTokenPerHour;
  }
}

function floorToHour(instant: Date): Date {
  return new Date(Math.floor(instant.getTime() / MS_PER_HOUR) * MS_PER_HOUR);
}
