// What happens when Supabase Auth refuses to send a sign-in link (#67, #68, #84). Kept
// apart from the Server Function so a unit test can check each answer.

// The sign-in form's answers. "sent" is also the answer for an address Auth will not
// make an account for, so the form does not tell a stranger who is a member.
export type SignInLinkAnswer = "sent" | "wait" | "email" | "failed";

// The fields of Supabase Auth's error that the answer depends on.
export interface OtpError {
  readonly status?: number | undefined;
  readonly code?: string | undefined;
  readonly message: string;
}

// A line for the operator's log. Never the address: it goes to the host's logs.
export interface OtpLogLine {
  readonly level: "warn" | "error";
  readonly message: string;
  readonly detail?: unknown;
}

export interface OtpErrorAnswer {
  readonly answer: SignInLinkAnswer;
  readonly log?: OtpLogLine;
}

const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
// Supabase Auth's answers when it will not make a new account for the address.
const NEW_ACCOUNTS_REFUSED: ReadonlySet<string> = new Set([
  "otp_disabled",
  "signup_disabled",
]);

function refusesNewAccounts(error: OtpError): boolean {
  return error.code !== undefined && NEW_ACCOUNTS_REFUSED.has(error.code);
}

// An open site, where the form waits for the send and answers from its result.
export function answerForOtpError(error: OtpError): OtpErrorAnswer {
  if (error.status === HTTP_TOO_MANY_REQUESTS) {
    return { answer: "wait" };
  }
  if (error.status === HTTP_BAD_REQUEST) {
    return { answer: "email" };
  }
  if (refusesNewAccounts(error)) {
    // This site would let the address in, but Supabase refused it: a hint for the
    // operator. The form still says "sent", as it does for a member.
    return {
      answer: "sent",
      log: {
        level: "warn",
        message:
          "Supabase Auth refuses new accounts by email: turn on 'Allow new users to sign up'",
      },
    };
  }
  return {
    answer: "failed",
    log: { level: "error", message: "sign-in link could not be sent", detail: error },
  };
}

// A closed site, where the form said "sent" before the send ran (#84). Every error
// answers "sent": the send limit that a member's second quick press meets must not say
// "wait", or the answer tells who is a member (#68). Only the log differs. A refused new
// address and an address Auth calls malformed are expected. The send limit is logged, so
// the operator sees why members get no link.
export function answerForClosedSiteOtpError(error: OtpError): OtpErrorAnswer {
  if (error.status === HTTP_BAD_REQUEST || refusesNewAccounts(error)) {
    return { answer: "sent" };
  }
  if (error.status === HTTP_TOO_MANY_REQUESTS) {
    return {
      answer: "sent",
      log: {
        level: "warn",
        message: "closed-site sign-in link held back: Supabase Auth's send limit",
      },
    };
  }
  return {
    answer: "sent",
    log: {
      level: "error",
      message: "closed-site sign-in link could not be sent",
      detail: error.code ?? error.message,
    },
  };
}

export function writeOtpLog(line: OtpLogLine | undefined): void {
  if (line === undefined) {
    return;
  }
  const write = line.level === "warn" ? console.warn : console.error;
  if (line.detail === undefined) {
    write(line.message);
  } else {
    write(line.message, line.detail);
  }
}
