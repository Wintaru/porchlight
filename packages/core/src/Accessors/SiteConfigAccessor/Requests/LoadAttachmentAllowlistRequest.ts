import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.attachment_allowlist` (D16). A missing key answers the default set.
export class LoadAttachmentAllowlistRequest extends RequestBase {}
