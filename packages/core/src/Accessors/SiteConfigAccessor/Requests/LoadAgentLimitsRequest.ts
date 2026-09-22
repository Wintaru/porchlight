import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.agent_limits` (D22). A missing key answers the defaults.
export class LoadAgentLimitsRequest extends RequestBase {}
