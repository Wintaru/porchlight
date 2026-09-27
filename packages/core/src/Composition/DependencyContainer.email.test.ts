import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { GetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/GetEmailSettingsRequest";
import { SetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/SetEmailSettingsRequest";
import { UnsubscribeRequest } from "../Managers/NotificationManager/Requests/UnsubscribeRequest";
import { EmailSettingsResponse } from "../Managers/NotificationManager/Responses/EmailSettingsResponse";
import { NotificationForbiddenResponse } from "../Managers/NotificationManager/Responses/NotificationForbiddenResponse";
import { UnsubscribedResponse } from "../Managers/NotificationManager/Responses/UnsubscribedResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

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
