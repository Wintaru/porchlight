import type { IPresenceAccessor } from "../../../Accessors/PresenceAccessor/IPresenceAccessor";
import { BroadcastPresenceRequest } from "../../../Accessors/PresenceAccessor/Requests/BroadcastPresenceRequest";
import { PresenceBroadcastResponse } from "../../../Accessors/PresenceAccessor/Responses/PresenceBroadcastResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadPresenceSettingRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadPresenceSettingRequest";
import { PresenceSettingLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/PresenceSettingLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { PresenceMessage, PresenceSignal } from "../../../Common/PresenceMessage";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { AnnouncePresenceRequest } from "../Requests/AnnouncePresenceRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { PresenceAnnouncedResponse } from "../Responses/PresenceAnnouncedResponse";
import { unavailable } from "../unavailable";

type Result =
  PresenceAnnouncedResponse | ActionForbiddenResponse | AccountUnavailableResponse;

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
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: AnnouncePresenceRequest): Promise<Result> {
    const { correlationId, actor, topic, signal, timestamp } = request;
    const context = { correlationId, timestamp };
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
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "presence.manage granted to a visitor",
      );
    }
    const setting = await this.profiles.load(
      new LoadPresenceSettingRequest(actor.profile.id, context),
    );
    if (!(setting instanceof PresenceSettingLoadedResponse)) {
      return unavailable(correlationId, setting, "profiles.load");
    }
    // A hidden member still asks who is here when they arrive, and names no one. `gone`
    // goes out either way, for a member who turned presence off mid-visit: it names
    // only a member the others still show. A page stops reporting, `gone` included, as
    // soon as an answer says the member is not shown, and a page hidden from the start
    // never sends it.
    const message: PresenceMessage | undefined =
      setting.visible || signal === "gone"
        ? shownMessage(actor.profile.id, signal)
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
    return new PresenceAnnouncedResponse(correlationId, setting.visible);
  }
}
