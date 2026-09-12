import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `site_config` table (SPEC.md §4, §7). `load` reads one key,
// parsed to its domain type at this edge. Writes arrive with #12's admin page.
export interface ISiteConfigAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
}
