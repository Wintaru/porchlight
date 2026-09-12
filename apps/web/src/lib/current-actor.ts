import {
  type Actor,
  GetProfileRequest,
  ProfileResponse,
  VISITOR,
} from "@porchlight/core";
import { cache } from "react";

import { getCurrentUser } from "@/auth/current-user";
import { getDependencyContainer } from "@/lib/dependency-container";

// The actor behind the current request, for Server Components and Server Functions. A
// session with no profile (a sign-in whose profile creation failed) counts as a visitor;
// the next sign-in runs EnsureProfile again. Deduped per request with React's `cache`,
// so the layout's header and the page pay for the lookup once.
export const getCurrentActor = cache(async (): Promise<Actor> => {
  const user = await getCurrentUser();
  if (user === undefined) {
    return VISITOR;
  }
  const response = await getDependencyContainer().accountManager.query(
    new GetProfileRequest({ by: "id", id: user.id }),
  );
  if (!(response instanceof ProfileResponse)) {
    return VISITOR;
  }
  return { kind: "member", profile: response.profile };
});
