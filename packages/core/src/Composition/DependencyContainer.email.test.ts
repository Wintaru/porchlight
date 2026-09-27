import { afterEach, describe, expect, test, vi } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { GetEmailAvailabilityRequest } from "../Managers/NotificationManager/Requests/GetEmailAvailabilityRequest";
import { GetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/GetEmailSettingsRequest";
import { SetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/SetEmailSettingsRequest";
import { ConfirmSubscriptionRequest } from "../Managers/NotificationManager/Requests/ConfirmSubscriptionRequest";
import { SubscribeRequest } from "../Managers/NotificationManager/Requests/SubscribeRequest";
import { UnsubscribeRequest } from "../Managers/NotificationManager/Requests/UnsubscribeRequest";
import { SubscribeRejectedResponse } from "../Managers/NotificationManager/Responses/SubscribeRejectedResponse";
import { SubscriptionConfirmedResponse } from "../Managers/NotificationManager/Responses/SubscriptionConfirmedResponse";
import { SubscriptionRequestedResponse } from "../Managers/NotificationManager/Responses/SubscriptionRequestedResponse";
import { EmailSettingsResponse } from "../Managers/NotificationManager/Responses/EmailSettingsResponse";
import { NotificationForbiddenResponse } from "../Managers/NotificationManager/Responses/NotificationForbiddenResponse";
import { UnsubscribedResponse } from "../Managers/NotificationManager/Responses/UnsubscribedResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

const AT = new Date("2026-09-27T10:00:00.000Z");

function member(overrides: Partial<Profile>): Actor {
  return {
    kind: "member",
    profile: {
      id: "00000000-0000-4000-8000-000000000004",
      handle: "june",
      displayName: "June",
      avatarUrl: null,
      bio: null,
      role: "member",
      trustLevel: "trusted",
      status: "active",
      createdAt: AT,
      ...overrides,
    },
  };
}

const JUNE = member({});
const MIRA = member({
  id: "00000000-0000-4000-8000-000000000002",
  handle: "mira",
  role: "moderator",
});

describe("DependencyContainer: email settings (#22)", () => {
  test("a member starts with email off, turns on a daily digest and reads it back", async () => {
    const container = new DependencyContainer({ ...FAKE_ENV, EMAIL_PROVIDER: "fake" });
    const before = await container.notificationManager.query(
      new GetEmailSettingsRequest(JUNE),
    );
    expect(before).toEqual(
      new EmailSettingsResponse(
        before.correlationId,
        true,
        { digest: "off", queueImmediate: false },
        false,
      ),
    );

    await container.notificationManager.execute(
      new SetEmailSettingsRequest(JUNE, { digest: "daily", queueImmediate: false }),
    );
    const after = await container.notificationManager.query(
      new GetEmailSettingsRequest(JUNE),
    );
    expect(after).toMatchObject({
      preference: { digest: "daily", queueImmediate: false },
    });
  });

  test("only staff may ask for the queue email", async () => {
    const container = new DependencyContainer({ ...FAKE_ENV, EMAIL_PROVIDER: "fake" });
    const queue = { digest: "off", queueImmediate: true } as const;

    expect(
      await container.notificationManager.execute(
        new SetEmailSettingsRequest(JUNE, queue),
      ),
    ).toBeInstanceOf(NotificationForbiddenResponse);
    expect(
      await container.notificationManager.execute(
        new SetEmailSettingsRequest(MIRA, queue),
      ),
    ).toMatchObject({ mayQueue: true, preference: queue });
  });

  test("a visitor has no email settings", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    expect(
      await container.notificationManager.query(
        new GetEmailSettingsRequest({ kind: "visitor" }),
      ),
    ).toBeInstanceOf(NotificationForbiddenResponse);
  });

  test("with no mail vendor the settings say email is off", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    expect(
      await container.notificationManager.query(new GetEmailSettingsRequest(JUNE)),
    ).toMatchObject({ enabled: false });
    expect(
      await container.notificationManager.query(new GetEmailAvailabilityRequest()),
    ).toMatchObject({ enabled: false });
  });

  test("an unknown or empty unsubscribe token finds nobody", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    for (const token of ["", "nobody"]) {
      const answer = await container.notificationManager.execute(
        new UnsubscribeRequest(token),
      );
      expect(answer).toEqual(new UnsubscribedResponse(answer.correlationId, false));
    }
  });
});

describe("DependencyContainer: reader subscriptions (#22, D20)", () => {
  const SITE = { name: "Porch", url: "https://porch.test" };
  const subscribe = (email: string, digest: "hourly" | "daily" | "off" = "daily") =>
    new SubscribeRequest(email, null, digest, "token", TEST_ORIGIN, SITE);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a reader asks, and the answer is the same the second time", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const container = new DependencyContainer({ ...FAKE_ENV, EMAIL_PROVIDER: "fake" });
    for (const email of ["Reader@Example.test", "reader@example.test"]) {
      expect(
        await container.notificationManager.execute(subscribe(email)),
      ).toBeInstanceOf(SubscriptionRequestedResponse);
    }
  });

  test("refuses a bad address, the off schedule, and a site with no mail vendor", async () => {
    const container = new DependencyContainer({ ...FAKE_ENV, EMAIL_PROVIDER: "fake" });
    for (const request of [subscribe("not-an-address"), subscribe("a@b.test", "off")]) {
      expect(await container.notificationManager.execute(request)).toMatchObject({
        reason: "invalid",
      });
    }
    const off = new DependencyContainer(FAKE_ENV);
    expect(await off.notificationManager.execute(subscribe("a@b.test"))).toMatchObject({
      reason: "email-off",
    });
  });

  test("one address is asked for at most five times an hour", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const container = new DependencyContainer({ ...FAKE_ENV, EMAIL_PROVIDER: "fake" });
    const answers = [];
    for (let i = 0; i < 6; i += 1) {
      answers.push(await container.notificationManager.execute(subscribe("r@x.test")));
    }
    expect(answers[4]).toBeInstanceOf(SubscriptionRequestedResponse);
    expect(answers[5]).toBeInstanceOf(SubscribeRejectedResponse);
    expect(answers[5]).toMatchObject({ reason: "rate-limited" });
  });

  test("a failed Turnstile check refuses the request", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      EMAIL_PROVIDER: "fake",
      TURNSTILE_FAKE_RESULT: "fail",
    });
    expect(
      await container.notificationManager.execute(subscribe("r@x.test")),
    ).toMatchObject({ reason: "turnstile-failed" });
  });

  test("an unknown confirmation link confirms nothing", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const answer = await container.notificationManager.execute(
      new ConfirmSubscriptionRequest("nope"),
    );
    expect(answer).toEqual(
      new SubscriptionConfirmedResponse(answer.correlationId, false),
    );
  });
});
