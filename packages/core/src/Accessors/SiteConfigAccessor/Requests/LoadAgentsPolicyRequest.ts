import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.agents` (D22). A missing key answers the default, `members`.
export class LoadAgentsPolicyRequest extends RequestBase {}
