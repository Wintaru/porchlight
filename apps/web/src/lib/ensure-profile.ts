import {
  EnsureProfileRequest,
  type Profile,
  ProfileResponse,
  SignUpClosedResponse,
} from "@porchlight/core";

import type { SessionUser } from "@/auth/session-user";
import { getDependencyContainer } from "@/lib/dependency-container";

// What the callback route does next. `undefined` means the store refused and the
// caller should drop the session rather than leave a member with no profile;
// `"sign-up-closed"` is the one refusal SPEC.md §4 says gets a plain message of its
// own (`site_config.sign_up`, #12) rather than the generic "sign-in did not complete".
export type EnsureProfileOutcome = Profile | "sign-up-closed" | undefined;

// Runs after every sign-in, whichever path minted the session: creates the profile on
// the first one and finds it on every later one.
export async function ensureProfileFor(user: SessionUser): Promise<EnsureProfileOutcome> {
  const response = await getDependencyContainer().accountManager.execute(
    new EnsureProfileRequest({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }),
  );
  if (response instanceof ProfileResponse) {
    return response.profile;
  }
  if (response instanceof SignUpClosedResponse) {
    return "sign-up-closed";
  }
  console.error(
    `profile not ensured after sign-in [${response.correlationId}]`,
    response,
  );
  return undefined;
}
