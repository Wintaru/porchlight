import { RequestBase } from "../../../Common/RequestBase";

// "May this site's members use agents?" The settings page reads it for every member to
// decide whether to show the Agents section, so like `GetRegionRequest` it carries no
// actor and no permission check (SPEC.md §17).
export class GetAgentsPolicyRequest extends RequestBase {}
