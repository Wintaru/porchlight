// Who may use agents at all, from `site_config.agents` (SPEC.md §17, D22). `members`
// opens the Agents section and the MCP door to every active member, `staff` to admins
// and moderators only, `off` hides the section and `/api/mcp` answers 403. Missing
// from the store means `members`, the same fallback every other D20 key uses.
export const AGENTS_POLICIES = ["members", "staff", "off"] as const;

export type AgentsPolicy = (typeof AGENTS_POLICIES)[number];

export const DEFAULT_AGENTS_POLICY: AgentsPolicy = "members";
