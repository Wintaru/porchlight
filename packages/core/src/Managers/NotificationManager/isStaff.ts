import type { Profile } from "../../Common/Profile";
import { isStaffRole } from "../../Common/UserRole";

// Who may get the moderation-queue email: the people who work the queue.
export function isStaff(profile: Profile): boolean {
  return isStaffRole(profile.role);
}
