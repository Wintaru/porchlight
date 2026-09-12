import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.posting` (D20). A missing key answers the default, `anyone`.
export class LoadPostingPolicyRequest extends RequestBase {}
