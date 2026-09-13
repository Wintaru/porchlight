import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.region` (SPEC.md §7). A missing key answers the default, `other`.
export class LoadRegionRequest extends RequestBase {}
