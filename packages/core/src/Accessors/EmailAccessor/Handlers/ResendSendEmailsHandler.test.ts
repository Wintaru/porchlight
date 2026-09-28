import { afterEach, describe, expect, test, vi } from "vitest";

import type { EmailMessage } from "../../../Common/EmailMessage";
import { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../Responses/EmailsSentResponse";
import type { SendClock } from "../SendClock";
import { ResendSendEmailsHandler } from "./ResendSendEmailsHandler";

// No network and no real waiting: fetch is replaced for each test, and the clock moves
// only when the handler sleeps.
function message(to: string, unsubscribeUrl: string | null = null): EmailMessage {
  return { to, subject: "Hello", text: "Hi", html: "<p>Hi</p>", unsubscribeUrl };
}

class TestClock implements SendClock {
  at = 1_000_000;
  readonly sleeps: number[] = [];

  now(): number {
    return this.at;
  }

  sleep(ms: number): Promise<void> {
    this.sleeps.push(ms);
    this.at += ms;
    return Promise.resolve();
  }
}

interface Call {
  readonly at: number;
  readonly key: string;
  readonly recipients: readonly string[];
}

// Answers each call from the list in turn (the last one repeats) and records when it
// came, its Idempotency-Key and its recipients.
function answers(clock: TestClock, ...replies: (() => Response)[]) {
  const calls: Call[] = [];
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string) as { to: string[] }[];
    calls.push({
      at: clock.now(),
      key: headers["idempotency-key"] ?? "",
      recipients: body.flatMap((item) => item.to),
    });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    return reply === undefined
      ? Promise.reject(new Error("no reply"))
      : Promise.resolve(reply());
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

const ok = () => new Response(JSON.stringify({ data: [] }), { status: 200 });
const status =
  (code: number, body = "{}", headers: Record<string, string> = {}) =>
  () =>
    new Response(body, { status: code, headers });

function answer(status: number, body: unknown = { data: [] }) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBodies(fetchMock: ReturnType<typeof answer>): unknown[] {
  return fetchMock.mock.calls.map((call) => {
    const [, init] = call as unknown as [string, RequestInit];
    return JSON.parse(init.body as string) as unknown;
  });
}

function many(count: number): EmailMessage[] {
  return Array.from({ length: count }, (_, i) => message(`m${String(i)}@x.test`));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResendSendEmailsHandler", () => {
  const clock = new TestClock();
  const handler = new ResendSendEmailsHandler(
    "re_key",
    "Porch <mail@example.test>",
    clock,
  );

  test("posts one batch with the key, the sender and one-click unsubscribe headers", async () => {
    const fetchMock = answer(200);

    const sent = await handler.handle(
      new SendEmailsRequest([message("a@example.test", "https://site.test/u?t=1")]),
    );

    expect(sent).toBeInstanceOf(EmailsSentResponse);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(init.headers).toMatchObject({ authorization: "Bearer re_key" });
    expect(sentBodies(fetchMock)[0]).toEqual([
      {
        from: "Porch <mail@example.test>",
        to: ["a@example.test"],
        subject: "Hello",
        text: "Hi",
        html: "<p>Hi</p>",
        headers: {
          "List-Unsubscribe": "<https://site.test/u?t=1>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
    ]);
  });

  test("a message with no unsubscribe link carries no list headers", async () => {
    const fetchMock = answer(200);

    await handler.handle(new SendEmailsRequest([message("a@example.test")]));

    expect(sentBodies(fetchMock)[0]).toMatchObject([{ headers: {} }]);
  });

  test("splits more than 100 messages into batches of 100", async () => {
    const fetchMock = answer(200);
    const sent = await handler.handle(new SendEmailsRequest(many(201)));

    expect(sent).toEqual(new EmailsSentResponse(sent.correlationId, 201));
    expect(sentBodies(fetchMock).map((body) => (body as unknown[]).length)).toEqual([
      100, 100, 1,
    ]);
  });

  test("a refusal fails the send with Resend's reason", async () => {
    answer(403, { message: "domain not verified" });

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailAccessFailedResponse);
    expect((sent as EmailAccessFailedResponse).reason).toContain("403");
    expect((sent as EmailAccessFailedResponse).reason).toContain("domain not verified");
  });

  test("a network error is tried three more times, then fails the send", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toEqual(new EmailAccessFailedResponse(sent.correlationId, "offline", 0));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

// Issue #86: pacing, one Idempotency-Key per chunk, bounded retries, partial results.
describe("ResendSendEmailsHandler under Resend's rate limit", () => {
  function setup() {
    const clock = new TestClock();
    const handler = new ResendSendEmailsHandler("re_key", "mail@example.test", clock);
    return { clock, handler };
  }

  test("waits 550 ms between calls, across requests too", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(clock, ok);

    await handler.handle(new SendEmailsRequest(many(150)));
    await handler.handle(new SendEmailsRequest([message("late@x.test")]));

    const gaps = calls.slice(1).map((call, i) => call.at - (calls[i]?.at ?? 0));
    expect(gaps).toEqual([550, 550]);
  });

  test("a 429 on a later chunk sends no duplicate to the earlier chunk", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(clock, ok, status(429, "{}", { "retry-after": "1" }), ok);

    const sent = await handler.handle(new SendEmailsRequest(many(150)));

    expect(sent).toEqual(new EmailsSentResponse(sent.correlationId, 150));
    // First chunk once; second chunk twice with the same key, so Resend sends it once.
    expect(calls.map((call) => call.recipients.length)).toEqual([100, 50, 50]);
    expect(calls[1]?.key).toBe(calls[2]?.key);
    expect(calls[0]?.key).not.toBe(calls[1]?.key);
    expect(calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    // Resend's retry-after of one second, not the default backoff.
    expect(clock.sleeps).toContain(1000);
  });

  test("a later chunk that keeps failing reports how many went out", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(clock, ok, status(503, "busy"));

    const sent = await handler.handle(new SendEmailsRequest(many(150)));

    expect(sent).toBeInstanceOf(EmailAccessFailedResponse);
    expect((sent as EmailAccessFailedResponse).sent).toBe(100);
    expect((sent as EmailAccessFailedResponse).reason).toContain("503");
    expect(calls.filter((call) => call.recipients.length === 100)).toHaveLength(1);
    expect(new Set(calls.slice(1).map((call) => call.key)).size).toBe(1);
  });

  test("retries stay inside five seconds", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(clock, status(429, "{}", { "retry-after": "3" }));
    const start = clock.now();

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailAccessFailedResponse);
    // 3 s, then a second 3 s would pass the window: two calls only.
    expect(calls).toHaveLength(2);
    expect(clock.now() - start).toBeLessThanOrEqual(5000);
  });

  test("a first try that times out is tried again under the same key", async () => {
    const { clock, handler } = setup();
    const keys: string[] = [];
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      keys.push((init.headers as Record<string, string>)["idempotency-key"] ?? "");
      if (keys.length === 1) {
        // Resend took the call but the answer never came back in time.
        clock.at += 4000;
        return Promise.reject(new DOMException("timed out", "TimeoutError"));
      }
      return Promise.resolve(ok());
    });
    vi.stubGlobal("fetch", fetchMock);

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailsSentResponse);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  test("an error body that cannot be read still leaves the chunk to the status", async () => {
    const { clock, handler } = setup();
    const unreadable = () => {
      const response = new Response("{}", { status: 503 });
      vi.spyOn(response, "text").mockRejectedValue(new Error("cut off"));
      return response;
    };
    const { calls } = answers(clock, unreadable, ok);

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailsSentResponse);
    expect(calls).toHaveLength(2);
  });

  test("a refusal that another try cannot fix is not tried again", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(clock, status(422, '{"name":"validation_error"}'));

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailAccessFailedResponse);
    expect(calls).toHaveLength(1);
  });

  test("a call still running under the same key is tried again", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(
      clock,
      status(409, '{"name":"concurrent_idempotent_requests"}'),
      ok,
    );

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailsSentResponse);
    expect(calls).toHaveLength(2);
  });

  test("a key used with another payload is not tried again", async () => {
    const { clock, handler } = setup();
    const { calls } = answers(
      clock,
      status(409, '{"name":"invalid_idempotent_request"}'),
    );

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toBeInstanceOf(EmailAccessFailedResponse);
    expect(calls).toHaveLength(1);
  });
});
