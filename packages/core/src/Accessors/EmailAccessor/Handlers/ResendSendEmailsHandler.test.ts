import { afterEach, describe, expect, test, vi } from "vitest";

import type { EmailMessage } from "../../../Common/EmailMessage";
import { SendEmailsRequest } from "../Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Responses/EmailAccessFailedResponse";
import { EmailsSentResponse } from "../Responses/EmailsSentResponse";
import { ResendSendEmailsHandler } from "./ResendSendEmailsHandler";

// No network: fetch is replaced for each test.
function message(to: string, unsubscribeUrl: string | null = null): EmailMessage {
  return { to, subject: "Hello", text: "Hi", html: "<p>Hi</p>", unsubscribeUrl };
}

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResendSendEmailsHandler", () => {
  const handler = new ResendSendEmailsHandler("re_key", "Porch <mail@example.test>");

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
    const many = Array.from({ length: 201 }, (_, i) => message(`m${String(i)}@x.test`));

    const sent = await handler.handle(new SendEmailsRequest(many));

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

  test("a network error fails the send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const sent = await handler.handle(new SendEmailsRequest([message("a@x.test")]));

    expect(sent).toEqual(new EmailAccessFailedResponse(sent.correlationId, "offline"));
  });
});
