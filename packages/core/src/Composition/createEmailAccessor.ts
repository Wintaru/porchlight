import { EmailAccessor } from "../Accessors/EmailAccessor/EmailAccessor";
import { FakeEmailState } from "../Accessors/EmailAccessor/FakeEmailState";
import { DisabledSendEmailsHandler } from "../Accessors/EmailAccessor/Handlers/DisabledSendEmailsHandler";
import { FakeSendEmailsHandler } from "../Accessors/EmailAccessor/Handlers/FakeSendEmailsHandler";
import { ResendSendEmailsHandler } from "../Accessors/EmailAccessor/Handlers/ResendSendEmailsHandler";
import type { IEmailAccessor } from "../Accessors/EmailAccessor/IEmailAccessor";
import { SendEmailsRequest } from "../Accessors/EmailAccessor/Requests/SendEmailsRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { assertFakeAllowedHere, readFakeResult } from "./readStoreProvider";

// `none` is the default, unlike every store's `supabase`: a deployment with no mail
// vendor sends no email and shows no email settings (docs/setup/email.md). It is not a
// fake, so ALLOW_FAKE_PROVIDERS does not turn it into one.
export const EMAIL_PROVIDERS = ["none", "fake", "resend"] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

function isEmailProvider(value: string): value is EmailProvider {
  return EMAIL_PROVIDERS.some((provider) => provider === value);
}

export function readEmailProvider(env: Environment): EmailProvider {
  const provider = setValue(env, "EMAIL_PROVIDER") ?? "none";
  if (!isEmailProvider(provider)) {
    throw new Error(
      `EMAIL_PROVIDER=${provider} is not a known provider. Known: ${EMAIL_PROVIDERS.join(", ")}.`,
    );
  }
  return provider;
}

// A set, non-blank value, trimmed; blank counts as unset.
function setValue(env: Environment, variable: string): string | undefined {
  const value = env[variable]?.trim();
  return value === "" ? undefined : value;
}

function required(env: Environment, variable: string, provider: string): string {
  const value = setValue(env, variable);
  if (value === undefined) {
    throw new Error(`EMAIL_PROVIDER=${provider} needs ${variable}.`);
  }
  return value;
}

// The mail vendor behind digests and subscriptions (SPEC.md §8, D14, #22).
export function createEmailAccessor(env: Environment): IEmailAccessor {
  const provider = readEmailProvider(env);
  switch (provider) {
    case "none":
      return new EmailAccessor(
        new HandlerResolverBuilder()
          .register(SendEmailsRequest, new DisabledSendEmailsHandler())
          .build(),
      );
    case "fake": {
      assertFakeAllowedHere(
        env,
        "EMAIL_PROVIDER=fake is not allowed in a production build.",
      );
      const mailpitUrl = setValue(env, "EMAIL_FAKE_MAILPIT_URL") ?? null;
      const state = new FakeEmailState(
        setValue(env, "EMAIL_FROM") ?? "porchlight@localhost",
        mailpitUrl,
        readFakeResult(env, "EMAIL_FAKE_RESULT") === "fail",
      );
      return new EmailAccessor(
        new HandlerResolverBuilder()
          .register(SendEmailsRequest, new FakeSendEmailsHandler(state))
          .build(),
      );
    }
    case "resend":
      return new EmailAccessor(
        new HandlerResolverBuilder()
          .register(
            SendEmailsRequest,
            new ResendSendEmailsHandler(
              required(env, "EMAIL_API_KEY", provider),
              required(env, "EMAIL_FROM", provider),
            ),
          )
          .build(),
      );
  }
}
