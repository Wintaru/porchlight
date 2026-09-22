import { RequestBase } from "../../../Common/RequestBase";

// "How much may one agent token do in a day?" The MCP door answers this to a connecting
// agent, so like `GetAgentsPolicyRequest` it carries no actor and no permission check:
// the caps are a site rule, not a secret (SPEC.md §17).
export class GetAgentLimitsRequest extends RequestBase {}
