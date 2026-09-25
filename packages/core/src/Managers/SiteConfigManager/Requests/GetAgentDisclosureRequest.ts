import { RequestBase } from "../../../Common/RequestBase";

// "Does a post an agent drafted say so?" Every post page reads it, for any reader, so
// like `GetAgentsPolicyRequest` it carries no actor and no permission check (SPEC.md §17).
export class GetAgentDisclosureRequest extends RequestBase {}
