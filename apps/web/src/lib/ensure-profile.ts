import { EnsureProfileRequest, type Profile, ProfileResponse } from "@porchlight/core";

import type { SessionUser } from "@/auth/session-user";
import { getDependencyContainer } from "@/lib/dependency-container";

// Runs after every sign-in, whichever path minted the session: creates the profile on
// the first one and finds it on every later one. Undefined means the store refused and
// the caller should drop the session rather than leave a member with no profile.
export async function ensureProfileFor(user: SessionUser): Promise<Profile | undefined> {
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
  console.error(
    `profile not ensured after sign-in [${response.correlationId}]`,
    response,
  );
  return undefined;
}
