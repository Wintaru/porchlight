import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.comments` (D20). A missing key answers the default, `anyone`.
export class LoadCommentPolicyRequest extends RequestBase {}
