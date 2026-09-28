import { describe, expect, test } from "vitest";

import {
  answerForClosedSiteOtpError,
  answerForOtpError,
  type OtpError,
} from "./otp-error";

const SEND_LIMIT: OtpError = {
  status: 429,
  code: "over_email_send_rate_limit",
  message: "For security purposes, you can only request this after 1 seconds.",
};
const MALFORMED: OtpError = { status: 400, code: "validation_failed", message: "bad" };
const SIGN_UP_OFF: OtpError = { status: 422, code: "signup_disabled", message: "off" };
const OTP_OFF: OtpError = { status: 422, code: "otp_disabled", message: "off" };
const OUTAGE: OtpError = { status: 500, code: "unexpected_failure", message: "down" };

describe("answerForOtpError: an open site answers from the send", () => {
  test.each([
    ["the send limit", SEND_LIMIT, "wait"],
    ["a malformed address", MALFORMED, "email"],
    ["sign-up switched off at Auth", SIGN_UP_OFF, "sent"],
    ["email sign-in switched off at Auth", OTP_OFF, "sent"],
    ["an outage", OUTAGE, "failed"],
  ] as const)("%s answers %s", (_name, error, answer) => {
    expect(answerForOtpError(error).answer).toBe(answer);
  });

  test("an outage is logged as an error, a refusal at Auth as a hint", () => {
    expect(answerForOtpError(OUTAGE).log?.level).toBe("error");
    expect(answerForOtpError(SIGN_UP_OFF).log?.level).toBe("warn");
    expect(answerForOtpError(SEND_LIMIT).log).toBeUndefined();
  });
});

// #68: on a closed site a member's second quick press meets the send limit. A stranger's
// address never gets that far, so a "wait" would tell who is a member.
describe("answerForClosedSiteOtpError: a closed site always says sent", () => {
  test.each([SEND_LIMIT, MALFORMED, SIGN_UP_OFF, OTP_OFF, OUTAGE])(
    "$code answers sent",
    (error) => {
      expect(answerForClosedSiteOtpError(error).answer).toBe("sent");
    },
  );

  test("the send limit and an outage reach the log, the expected refusals do not", () => {
    expect(answerForClosedSiteOtpError(SEND_LIMIT).log?.level).toBe("warn");
    expect(answerForClosedSiteOtpError(OUTAGE).log).toMatchObject({
      level: "error",
      detail: "unexpected_failure",
    });
    expect(answerForClosedSiteOtpError(MALFORMED).log).toBeUndefined();
    expect(answerForClosedSiteOtpError(SIGN_UP_OFF).log).toBeUndefined();
    expect(answerForClosedSiteOtpError(OTP_OFF).log).toBeUndefined();
  });
});
