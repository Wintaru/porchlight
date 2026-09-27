import type { DigestSchedule } from "./DigestSchedule";

// A member's email settings (#22). `queueImmediate` is the moderation-queue email, which
// only reaches an admin or moderator. A member with no saved row has DEFAULT_EMAIL_PREFERENCE.
export interface EmailPreference {
  readonly digest: DigestSchedule;
  readonly queueImmediate: boolean;
}

// Email is opt in: nobody gets mail they did not ask for.
export const DEFAULT_EMAIL_PREFERENCE: EmailPreference = {
  digest: "off",
  queueImmediate: false,
};
