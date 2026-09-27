import { afterEach, describe, expect, test, vi } from "vitest";

import { SendEmailsRequest } from "../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { EmailAccessFailedResponse } from "../Accessors/EmailAccessor/Responses/EmailAccessFailedResponse";
import { EmailDisabledResponse } from "../Accessors/EmailAccessor/Responses/EmailDisabledResponse";
import { EmailsSentResponse } from "../Accessors/EmailAccessor/Responses/EmailsSentResponse";
import type { EmailMessage } from "../Common/EmailMessage";
import { createEmailAccessor, readEmailProvider } from "./createEmailAccessor";

const MESSAGE: EmailMessage = {
  to: "reader@example.test",
  subject: "New on the porch",
  text: "Hi",
  html: "<p>Hi</p>",
  unsubscribeUrl: "http://site.test/email/unsubscribe?token=t",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("readEmailProvider", () => {
  test("unset and blank mean none: no email, not a fake", () => {
    expect(readEmailProvider({})).toBe("none");
    expect(readEmailProvider({ EMAIL_PROVIDER: " " })).toBe("none");
  });

  test("an unknown provider is a startup error", () => {
    expect(() => readEmailProvider({ EMAIL_PROVIDER: "ses" })).toThrow(/not a known/);
  });
});

describe("createEmailAccessor", () => {
  test("none answers disabled, even in production", async () => {
    const email = createEmailAccessor({ NODE_ENV: "production" });

    expect(await email.store(new SendEmailsRequest([MESSAGE]))).toBeInstanceOf(
      EmailDisabledResponse,
    );
  });

  test("the fake is refused in production unless fakes are allowed", () => {
    expect(() =>
      createEmailAccessor({ NODE_ENV: "production", EMAIL_PROVIDER: "fake" }),
    ).toThrow(/ALLOW_FAKE_PROVIDERS/);
    expect(() =>
      createEmailAccessor({
        NODE_ENV: "production",
        EMAIL_PROVIDER: "fake",
        ALLOW_FAKE_PROVIDERS: "1",
      }),
    ).not.toThrow();
  });

  test("the fake sends without a catcher, and fails on EMAIL_FAKE_RESULT=fail", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const ok = createEmailAccessor({ EMAIL_PROVIDER: "fake" });
    const failing = createEmailAccessor({
      EMAIL_PROVIDER: "fake",
      EMAIL_FAKE_RESULT: "fail",
    });

    expect(await ok.store(new SendEmailsRequest([MESSAGE]))).toBeInstanceOf(
      EmailsSentResponse,
    );
    expect(await failing.store(new SendEmailsRequest([MESSAGE]))).toBeInstanceOf(
      EmailAccessFailedResponse,
    );
  });

  test("the fake delivers to the local mail catcher when one is named", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const email = createEmailAccessor({
      EMAIL_PROVIDER: "fake",
      EMAIL_FROM: "Porch <porch@localhost>",
      EMAIL_FAKE_MAILPIT_URL: "http://127.0.0.1:58324/",
    });

    await email.store(new SendEmailsRequest([MESSAGE]));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:58324/api/v1/send");
    expect(JSON.parse(init.body as string)).toEqual({
      From: { Name: "Porch", Email: "porch@localhost" },
      To: [{ Email: "reader@example.test" }],
      Subject: "New on the porch",
      Text: "Hi",
      HTML: "<p>Hi</p>",
      Headers: {
        "List-Unsubscribe": "<http://site.test/email/unsubscribe?token=t>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  });

  test("resend needs a key and a sender", () => {
    expect(() => createEmailAccessor({ EMAIL_PROVIDER: "resend" })).toThrow(
      /EMAIL_API_KEY/,
    );
    expect(() =>
      createEmailAccessor({ EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "re_1" }),
    ).toThrow(/EMAIL_FROM/);
  });
});
