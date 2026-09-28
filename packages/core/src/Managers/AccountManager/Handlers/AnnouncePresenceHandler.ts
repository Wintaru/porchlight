import type { IPresenceAccessor } from "../../../Accessors/PresenceAccessor/IPresenceAccessor";
import { BroadcastPresenceRequest } from "../../../Accessors/PresenceAccessor/Requests/BroadcastPresenceRequest";
import { PresenceBroadcastResponse } from "../../../Accessors/PresenceAccessor/Responses/PresenceBroadcastResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadPresenceMemberRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadPresenceMemberRequest";
import { PresenceMemberLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/PresenceMemberLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { IRateLimitAccessor } from "../../../Accessors/RateLimitAccessor/IRateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { RateLimitBumpedResponse } from "../../../Accessors/RateLimitAccessor/Responses/RateLimitBumpedResponse";
import { type Actor, VISITOR } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { PresenceMessage, PresenceSignal } from "../../../Common/PresenceMessage";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { AnnouncePresenceRequest } from "../Requests/AnnouncePresenceRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { PresenceAnnouncedResponse } from "../Responses/PresenceAnnouncedResponse";
import { PresenceRateLimitedResponse } from "../Responses/PresenceRateLimitedResponse";
import { unavailable } from "../unavailable";

type Result =
  | PresenceAnnouncedResponse
  | PresenceRateLimitedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

const MS_PER_MINUTE = 60_000;

// Per member per minute (#89, decision C7). A page reports every 20 seconds and on
// each change of typing: a fast typist with two tabs reaches about 60. A `join` makes
// every member on the channel answer, so joins have a counter of their own, and a
// member who reloads in a loop cannot use up the allowance their reports need. A tab
// that comes back into view joins again, so joins allow 30: 12 was reached by a reader
// who changes windows about 6 times a minute.
export const PRESENCE_REPORTS_PER_MINUTE = 120;
export const PRESENCE_JOINS_PER_MINUTE = 30;

// What goes out for a member who lets others see them.
function shownMessage(memberId: string, signal: PresenceSignal): PresenceMessage {
  if (signal === "gone") {
    return { kind: "gone", memberId };
  }
  return {
    kind: "here",
    memberId,
    typing: signal === "typing",
    rollCall: signal === "join",
  };
}

// The start of the minute this moment belongs to: the window every count shares.
function minuteFloor(at: Date): Date {
  return new Date(Math.floor(at.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE);
}

// Presence through the server (#81, D26). The member id in the message is the
// caller's own, so no one can appear as another member. Every call asks the same
// questions again, so a member suspended or switched off mid-visit stops being
// announced at their next report, and the other pages let them lapse.
export class AnnouncePresenceHandler implements IHandler<
  AnnouncePresenceRequest,
  Result
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly presence: IPresenceAccessor,
    private readonly rateLimits: IRateLimitAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: AnnouncePresenceRequest): Promise<Result> {
    const { correlationId, memberId, topic, signal, timestamp } = request;
    const context = { correlationId, timestamp };
    // Counted first, so a flood costs one write a call and no profile read. The
    // subject is the verified session's id, so only a signed-in caller is counted.
    const limited = await this.overLimit(memberId, signal, context);
    if (limited !== undefined) {
      return limited;
    }
    // One read (#89): the profile the permission rule needs, and the setting.
    const loaded = await this.profiles.load(
      new LoadPresenceMemberRequest(memberId, context),
    );
    if (
      !(loaded instanceof PresenceMemberLoadedResponse) &&
      !(loaded instanceof ProfileNotFoundResponse)
    ) {
      return unavailable(correlationId, loaded, "profiles.load");
    }
    // A session with no profile is a visitor, as getCurrentActor treats it.
    const actor: Actor =
      loaded instanceof PresenceMemberLoadedResponse
        ? { kind: "member", profile: loaded.profile }
        : VISITOR;
    const refused = await permit(
      this.permissions,
      actor,
      "presence.manage",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (!(loaded instanceof PresenceMemberLoadedResponse)) {
      return new AccountUnavailableResponse(
        correlationId,
        "presence.manage granted to a visitor",
      );
    }
    // A hidden member still asks who is here when they arrive, and names no one. `gone`
    // goes out either way, for a member who turned presence off mid-visit: it names
    // only a member the others still show. A page stops reporting, `gone` included, as
    // soon as an answer says the member is not shown, and a page hidden from the start
    // never sends it.
    const message: PresenceMessage | undefined =
      loaded.visible || signal === "gone"
        ? shownMessage(memberId, signal)
        : signal === "join"
          ? { kind: "roll-call" }
          : undefined;
    if (message === undefined) {
      return new PresenceAnnouncedResponse(correlationId, false);
    }
    const sent = await this.presence.store(
      new BroadcastPresenceRequest(topic, message, context),
    );
    if (!(sent instanceof PresenceBroadcastResponse)) {
      return unavailable(correlationId, sent, "presence.store");
    }
    return new PresenceAnnouncedResponse(correlationId, loaded.visible);
  }

  // Bumps the member's counter for this kind of report. The bump answers the new
  // count in one round trip, so two reports at once cannot both read "under".
  private async overLimit(
    memberId: string,
    signal: PresenceSignal,
    context: Required<Pick<RequestContext, "correlationId" | "timestamp">>,
  ): Promise<PresenceRateLimitedResponse | AccountUnavailableResponse | undefined> {
    const [action, limit] =
      signal === "join"
        ? ["presence.join", PRESENCE_JOINS_PER_MINUTE]
        : ["presence.report", PRESENCE_REPORTS_PER_MINUTE];
    const windowStart = minuteFloor(context.timestamp);
    const bumped = await this.rateLimits.store(
      new BumpRateLimitRequest(`member:${memberId}`, action, windowStart, context),
    );
    if (!(bumped instanceof RateLimitBumpedResponse)) {
      return unavailable(context.correlationId, bumped, "rateLimits.store");
    }
    return bumped.count > limit
      ? new PresenceRateLimitedResponse(
          context.correlationId,
          new Date(windowStart.getTime() + MS_PER_MINUTE),
        )
      : undefined;
  }
}
