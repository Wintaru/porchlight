import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.anonymous_upload_cap` (D15). A missing key answers the default.
export class LoadAnonymousUploadCapRequest extends RequestBase {}
