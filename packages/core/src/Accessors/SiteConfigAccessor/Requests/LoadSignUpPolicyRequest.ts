import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.sign_up` (D20). A missing key answers the default, `open`.
export class LoadSignUpPolicyRequest extends RequestBase {}
