import { describe, expect, test } from "vitest";

import { FakePresenceState } from "../../../Accessors/PresenceAccessor/FakePresenceState";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import { FakeRateLimitState } from "../../../Accessors/RateLimitAccessor/FakeRateLimitState";
import { FakeBumpRateLimitHandler } from "../../../Accessors/RateLimitAccessor/Handlers/FakeBumpRateLimitHandler";
import { RateLimitAccessor } from "../../../Accessors/RateLimitAccessor/RateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { Profile } from "../../../Common/Profile";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakePresenceAccessor } from "../../../Composition/createPresenceAccessor";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import type { PresenceSignal } from "../../../Common/PresenceMessage";
import { parsePresenceTopic, type PresenceTopic } from "../../../Common/PresenceTopic";
import { AnnouncePresenceRequest } from "../Requests/AnnouncePresenceRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { PresenceAnnouncedResponse } from "../Responses/PresenceAnnouncedResponse";
import { PresenceRateLimitedResponse } from "../Responses/PresenceRateLimitedResponse";
import {
  AnnouncePresenceHandler,
  PRESENCE_JOINS_PER_MINUTE,
  PRESENCE_REPORTS_PER_MINUTE,
} from "./AnnouncePresenceHandler";

// Issue #81 (D26): the server vouches for who is online and typing. The message always
// names the caller, a hidden member is never named, and a member who may not use
// presence sends nothing. Issue #89: one profile read, and a limit per member.

const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";
const NO_PROFILE_ID = "00000000-0000-4000-8000-0000000000ff";
const MIDMINUTE = new Date("2026-09-28T12:00:30.000Z");
const NEXT_MINUTE = new Date("2026-09-28T12:01:00.000Z");
const POST_TOPIC = "presence:post:6e1a791f-75b8-46fb-a738-7c53cb270412";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: THEO_ID,
    handle: "theo",
    displayName: "Theo",
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: new Date("2026-09-27T10:00:00.000Z"),
    ...overrides,
  };
}

function topic(value: string): PresenceTopic {
  const parsed = parsePresenceTopic(value);
  if (parsed === undefined) {
    throw new Error(`${value} is not a presence topic`);
  }
  return parsed;
}

interface BuildOptions {
  readonly hidden?: boolean;
  readonly failing?: boolean;
  readonly status?: Profile["status"];
}

function build({
  hidden = false,
  failing = false,
  status = "active",
}: BuildOptions = {}) {
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO_ID, profile({ status }));
  profiles.profiles.set(JUNE_ID, profile({ id: JUNE_ID, handle: "june" }));
  if (hidden) {
    profiles.presenceHidden.add(THEO_ID);
  }
  const presence = new FakePresenceState(failing);
  const handler = new AnnouncePresenceHandler(
    createFakeProfileAccessor(profiles),
    createFakePresenceAccessor(presence),
    new RateLimitAccessor(
      new HandlerResolverBuilder()
        .register(
          BumpRateLimitRequest,
          new FakeBumpRateLimitHandler(new FakeRateLimitState()),
        )
        .build(),
    ),
    createPermissionEngine(
      fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
    ),
  );
  const announce = (signal: PresenceSignal, memberId = THEO_ID, at = MIDMINUTE) =>
    handler.handle(
      new AnnouncePresenceRequest(memberId, topic(POST_TOPIC), signal, {
        timestamp: at,
      }),
    );
  return { presence, announce };
}

describe("AnnouncePresence", () => {
  test("a shown member is announced as themselves, and `join` asks the others", async () => {
    const { presence, announce } = build();

    expect(await announce("join")).toBeInstanceOf(PresenceAnnouncedResponse);
    await announce("typing");
    await announce("here");
    await announce("gone");

    expect(presence.sent).toEqual([
      {
        topic: POST_TOPIC,
        message: { kind: "here", memberId: THEO_ID, typing: false, rollCall: true },
      },
      {
        topic: POST_TOPIC,
        message: { kind: "here", memberId: THEO_ID, typing: true, rollCall: false },
      },
      {
        topic: POST_TOPIC,
        message: { kind: "here", memberId: THEO_ID, typing: false, rollCall: false },
      },
      { topic: POST_TOPIC, message: { kind: "gone", memberId: THEO_ID } },
    ]);
  });

  test("a hidden member is never shown: `join` is a roll call, and only `gone` names them", async () => {
    const { presence, announce } = build({ hidden: true });

    expect(await announce("join")).toMatchObject({ shown: false });
    expect(await announce("typing")).toMatchObject({ shown: false });
    expect(await announce("here")).toMatchObject({ shown: false });
    // A member who turned presence off mid-visit leaves the others' lists.
    await announce("gone");

    expect(presence.sent).toEqual([
      { topic: POST_TOPIC, message: { kind: "roll-call" } },
      { topic: POST_TOPIC, message: { kind: "gone", memberId: THEO_ID } },
    ]);
  });

  test("a suspended member and a session with no profile send nothing", async () => {
    const suspended = build({ status: "suspended" });
    expect(await suspended.announce("join")).toBeInstanceOf(ActionForbiddenResponse);
    expect(suspended.presence.sent).toEqual([]);

    const { presence, announce } = build();
    expect(await announce("join", NO_PROFILE_ID)).toBeInstanceOf(ActionForbiddenResponse);
    expect(presence.sent).toEqual([]);
  });

  test("reports over the limit in a minute are refused until the next minute", async () => {
    const { presence, announce } = build();
    for (let i = 0; i < PRESENCE_REPORTS_PER_MINUTE; i++) {
      expect(await announce("here")).toBeInstanceOf(PresenceAnnouncedResponse);
    }
    const refused = await announce("typing");
    expect(refused).toBeInstanceOf(PresenceRateLimitedResponse);
    expect(refused).toMatchObject({ retryAt: NEXT_MINUTE });
    expect(presence.sent).toHaveLength(PRESENCE_REPORTS_PER_MINUTE);

    // Another member has an allowance of their own, and the next minute starts again.
    expect(await announce("here", JUNE_ID)).toBeInstanceOf(PresenceAnnouncedResponse);
    expect(await announce("here", THEO_ID, NEXT_MINUTE)).toBeInstanceOf(
      PresenceAnnouncedResponse,
    );
  });

  test("joins have their own, smaller limit, and do not use up the reports", async () => {
    const { announce } = build();
    for (let i = 0; i < PRESENCE_JOINS_PER_MINUTE; i++) {
      expect(await announce("join")).toBeInstanceOf(PresenceAnnouncedResponse);
    }
    expect(await announce("join")).toBeInstanceOf(PresenceRateLimitedResponse);
    expect(await announce("here")).toBeInstanceOf(PresenceAnnouncedResponse);
  });

  test("a failed broadcast is unavailable, not announced", async () => {
    const { announce } = build({ failing: true });

    expect(await announce("here")).toBeInstanceOf(AccountUnavailableResponse);
  });
});

describe("parsePresenceTopic", () => {
  test("admits the site channel and a post's channel, and nothing else", () => {
    expect(parsePresenceTopic("presence:site")).toBe("presence:site");
    expect(parsePresenceTopic(POST_TOPIC)).toBe(POST_TOPIC);
    for (const other of [
      "presence:site:x",
      "presence:post:not-a-uuid",
      "notifications:" + THEO_ID,
      "realtime:presence:site",
      "",
    ]) {
      expect(parsePresenceTopic(other)).toBeUndefined();
    }
  });
});
