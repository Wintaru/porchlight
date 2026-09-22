import type { Profile } from "./Profile";

// Who may use agents at all, from `site_config.agents` (SPEC.md §17, D22). `members`
// opens the Agents section and the MCP door to every active member, `staff` to admins
// and moderators only, `off` hides the section and `/api/mcp` answers 403. Missing
// from the store means `members`, the same fallback every other D20 key uses.
export const AGENTS_POLICIES = ["members", "staff", "off"] as const;

export type AgentsPolicy = (typeof AGENTS_POLICIES)[number];

export const DEFAULT_AGENTS_POLICY: AgentsPolicy = "members";

// Whether `policy` opens agents to this member. The one reading of members/staff/off,
// shared by the PermissionEngine's agent rules, the settings page's section, and the
// MCP door's 403 (#28), so the three cannot drift apart.
export function agentsOpenTo(
  profile: Pick<Profile, "role">,
  policy: AgentsPolicy,
): boolean {
  switch (policy) {
    case "members":
      return true;
    case "staff":
      return profile.role === "admin" || profile.role === "moderator";
    case "off":
      return false;
  }
}
