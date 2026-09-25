// Whether a post an agent drafted says so on its page, from `site_config.agent_disclosure`
// (SPEC.md §17, D22). `footer` adds one line under the post; `off` adds nothing. Missing
// from the store means `footer`: readers are told unless an admin decides otherwise.
export const AGENT_DISCLOSURES = ["off", "footer"] as const;

export type AgentDisclosure = (typeof AGENT_DISCLOSURES)[number];

export const DEFAULT_AGENT_DISCLOSURE: AgentDisclosure = "footer";
