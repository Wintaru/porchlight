import { afterEach, describe, expect, test, vi } from "vitest";

import { FakeEmailPreferenceState } from "../../../Accessors/EmailPreferenceAccessor/FakeEmailPreferenceState";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { createEmailAccessor } from "../../../Composition/createEmailAccessor";
import { createEmailComposeEngine } from "../../../Composition/createEmailComposeEngine";
import { createFakeEmailPreferenceAccessor } from "../../../Composition/createEmailPreferenceAccessor";
import { SendDigestsRequest } from "../Requests/SendDigestsRequest";
import { DigestsSentResponse } from "../Responses/DigestsSentResponse";
import { SendDigestsHandler } from "./SendDigestsHandler";

const SITE = { name: "Porch", url: "https://porch.test" };
const AT = new Date("2026-09-27T12:00:00.000Z");

function claim(profileId: string): MemberEmailClaim {
  return {
    profileId,
    email: `${profileId}@example.test`,
    unsubscribeToken: `tok-${profileId}`,
    kind: "digest",
    windowStart: new Date("2026-09-27T10:00:00.000Z"),
    windowEnd: new Date("2026-09-27T11:58:00.000Z"),
    counts: { "reply.created": 1 },
  };
}

function wire(options: { enabled?: boolean; failingSend?: boolean } = {}) {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const state = new FakeEmailPreferenceState();
  const handler = new SendDigestsHandler(
    createFakeEmailPreferenceAccessor(state),
    createEmailAccessor({
      EMAIL_PROVIDER: "fake",
      EMAIL_FAKE_RESULT: options.failingSend === true ? "fail" : "ok",
    }),
    createEmailComposeEngine(),
    { enabled: options.enabled ?? true },
  );
  return { state, handler };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SendDigestsHandler", () => {
  test("sends one email per due claim, and nothing is left due", async () => {
    const { state, handler } = wire();
    state.due = [claim("u1"), claim("u2")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 2, 0));
    expect(state.due).toEqual([]);
    expect(state.released).toEqual([]);
  });

  test("a failed send puts every claimed window back for the next run", async () => {
    const { state, handler } = wire({ failingSend: true });
    state.due = [claim("u1"), claim("u2")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(
      new DigestsSentResponse(sent.correlationId, 0, 2, "EMAIL_FAKE_RESULT=fail"),
    );
    expect(state.released.map((c) => c.profileId)).toEqual(["u1", "u2"]);
  });

  test("with email off, nothing is claimed", async () => {
    const { state, handler } = wire({ enabled: false });
    state.due = [claim("u1")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 0, 0));
    expect(state.due).toHaveLength(1);
  });

  test("works through more than one batch", async () => {
    const { state, handler } = wire();
    state.due = Array.from({ length: 150 }, (_, i) => claim(`u${String(i)}`));

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 150, 0));
  });
});
