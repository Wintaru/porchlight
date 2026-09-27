import { describe, expect, test } from "vitest";

import { FakePresenceState } from "../../../Accessors/PresenceAccessor/FakePresenceState";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { type Actor, VISITOR } from "../../../Common/Actor";
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
import { AnnouncePresenceHandler } from "./AnnouncePresenceHandler";

// Issue #81 (D26): the server vouches for who is online and typing. The message always
// names the caller, a hidden member is never named, and a member who may not use
// presence sends nothing.

const THEO_ID = "00000000-0000-4000-8000-000000000003";
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

function build({ hidden = false, failing = false } = {}) {
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO_ID, profile());
  if (hidden) {
    profiles.presenceHidden.add(THEO_ID);
  }
  const presence = new FakePresenceState(failing);
  const handler = new AnnouncePresenceHandler(
    createFakeProfileAccessor(profiles),
    createFakePresenceAccessor(presence),
    createPermissionEngine(
      fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
    ),
  );
  const announce = (signal: PresenceSignal, actor: Actor = THEO) =>
    handler.handle(new AnnouncePresenceRequest(actor, topic(POST_TOPIC), signal));
  return { presence, announce };
}

const THEO: Actor = { kind: "member", profile: profile() };

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

  test("a suspended member and a visitor send nothing", async () => {
    const { presence, announce } = build();
    const suspended: Actor = {
      kind: "member",
      profile: profile({ status: "suspended" }),
    };

    expect(await announce("join", suspended)).toBeInstanceOf(ActionForbiddenResponse);
    expect(await announce("join", VISITOR)).toBeInstanceOf(ActionForbiddenResponse);
    expect(presence.sent).toEqual([]);
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
