import type { EnsureProfileOptions } from "./EnsureProfileOptions";

// Whether a new account at `email` would be the site's admin (SPEC.md §4): the
// configured admin email, or, with none configured, the first profile ever. A
// configured email replaces the first-profile rule: otherwise a stranger who signs in
// between the deploy and the owner's first sign-in becomes admin. EnsureProfile and the
// sign-in link check (#68) share this, so the two can never disagree.
export function isSiteAdminEmail(
  options: EnsureProfileOptions,
  existingProfiles: number,
  email: string,
): boolean {
  const adminEmail = options.adminEmail?.trim().toLowerCase();
  if (adminEmail !== undefined && adminEmail !== "") {
    return adminEmail === email.trim().toLowerCase();
  }
  return existingProfiles === 0;
}
