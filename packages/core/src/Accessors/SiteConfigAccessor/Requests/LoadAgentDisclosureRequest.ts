import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.agent_disclosure` (D22). A missing key answers the default, `footer`.
export class LoadAgentDisclosureRequest extends RequestBase {}
