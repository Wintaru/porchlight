import type { Profile } from "../../Common/Profile";

// Who may get the moderation-queue email: the people who work the queue.
export function isStaff(profile: Profile): boolean {
  return profile.role === "admin" || profile.role === "moderator";
}
