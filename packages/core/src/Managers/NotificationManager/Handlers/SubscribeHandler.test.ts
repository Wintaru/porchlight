import { afterEach, describe, expect, test, vi } from "vitest";

import { EmailAccessor } from "../../../Accessors/EmailAccessor/EmailAccessor";
import { FakeEmailState } from "../../../Accessors/EmailAccessor/FakeEmailState";
import { FakeSendEmailsHandler } from "../../../Accessors/EmailAccessor/Handlers/FakeSendEmailsHandler";
import { SendEmailsRequest } from "../../../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import { FakeSubscriberState } from "../../../Accessors/SubscriberAccessor/FakeSubscriberState";
import type { AfterResponse } from "../../../Common/AfterResponse";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { Profile } from "../../../Common/Profile";
import { createEmailComposeEngine } from "../../../Composition/createEmailComposeEngine";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import { createRateLimitAccessor } from "../../../Composition/createRateLimitAccessor";
import { createFakeSubscriberAccessor } from "../../../Composition/createSubscriberAccessor";
import { createTurnstileAccessor } from "../../../Composition/createTurnstileAccessor";
import { FAKE_ENV, TEST_ORIGIN } from "../../../Composition/FakeEnvironment.test-helper";
import { SubscribeRequest } from "../Requests/SubscribeRequest";
import { SubscriptionRequestedResponse } from "../Responses/SubscriptionRequestedResponse";
import { SubscribeHandler } from "./SubscribeHandler";

const SITE = { name: "Porch", url: "https://porch.test" };
const AT = new Date("2026-09-27T10:00:00.000Z");
const THEO: Profile = {
  id: "00000000-0000-4000-8000-000000000003",
  handle: "theo",
  displayName: "Theo WIN A FREE CRUISE at spam.example",
  avatarUrl: null,
  bio: null,
  role: "member",
  trustLevel: "trusted",
  status: "active",
  createdAt: AT,
};

function wire(options: { failingSend?: boolean } = {}) {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const readers = new FakeSubscriberState();
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO.id, THEO);
  const outbox = new FakeEmailState("porch@localhost", null, options.failingSend);
  // Holds each task instead of running it, the way Next `after()` runs it only once
  // the response has gone.
  const later: (() => Promise<void>)[] = [];
  const afterResponse: AfterResponse = (task) => {
    later.push(task);
    return Promise.resolve();
  };
  const handler = new SubscribeHandler(
    createFakeSubscriberAccessor(readers),
    createFakeProfileAccessor(profiles),
    createTurnstileAccessor(FAKE_ENV),
    createRateLimitAccessor(FAKE_ENV, () => {
      throw new Error("no database in this test");
    }),
    new EmailAccessor(
      new HandlerResolverBuilder()
        .register(SendEmailsRequest, new FakeSendEmailsHandler(outbox))
        .build(),
    ),
    createEmailComposeEngine(),
    { enabled: true, ipHashSalt: "test-salt" },
    afterResponse,
  );
  const runLater = async () => {
    for (const task of later.splice(0)) {
      await task();
    }
  };
  return { readers, outbox, handler, later, runLater };
}

const subscribe = (email: string, authorId: string | null = null) =>
  new SubscribeRequest(email, authorId, "daily", "token", TEST_ORIGIN, SITE, {
    timestamp: AT,
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SubscribeHandler (#84)", () => {
  test("answers before the confirmation email goes out", async () => {
    const { outbox, handler, later, runLater } = wire();

    const answer = await handler.handle(subscribe("reader@example.test"));

    expect(answer).toBeInstanceOf(SubscriptionRequestedResponse);
    expect(outbox.sent).toEqual([]);
    expect(later).toHaveLength(1);
    await runLater();
    expect(outbox.sent.map((message) => message.to)).toEqual(["reader@example.test"]);
  });

  test("a confirmed address and a new one both answer before any send", async () => {
    const { readers, handler, later, runLater } = wire();
    await handler.handle(subscribe("old@example.test"));
    await runLater();
    const key = FakeSubscriberState.keyOf("old@example.test", null);
    const pending = readers.subscribers.get(key);
    if (pending === undefined) throw new Error("no pending row");
    readers.subscribers.set(key, { ...pending, confirmed: true, confirmToken: null });

    const confirmed = await handler.handle(subscribe("old@example.test"));
    const confirmedLater = later.length;
    const fresh = await handler.handle(subscribe("new@example.test"));

    expect(confirmed).toBeInstanceOf(SubscriptionRequestedResponse);
    expect(fresh).toBeInstanceOf(SubscriptionRequestedResponse);
    // The confirmed address schedules nothing, and neither answer waited on a send.
    expect(confirmedLater).toBe(0);
    expect(later).toHaveLength(1);
  });

  test("names the author by handle only, never the display name", async () => {
    const { outbox, handler, runLater } = wire();

    await handler.handle(subscribe("reader@example.test", THEO.id));
    await runLater();

    const [message] = outbox.sent;
    expect(message?.subject).toBe("Confirm your subscription to @theo on Porch");
    expect(
      `${message?.subject ?? ""}${message?.text ?? ""}${message?.html ?? ""}`,
    ).not.toContain("CRUISE");
  });

  test("a failed send is logged and releases the pending row, so a retry works at once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { readers, handler, runLater } = wire({ failingSend: true });

    const answer = await handler.handle(subscribe("reader@example.test"));
    await runLater();

    expect(answer).toBeInstanceOf(SubscriptionRequestedResponse);
    expect(readers.subscribers.size).toBe(0);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("the confirmation email did not go out"),
    );
  });
});
