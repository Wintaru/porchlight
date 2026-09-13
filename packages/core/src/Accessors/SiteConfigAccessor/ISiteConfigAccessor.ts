import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `site_config` table (SPEC.md §4, §7). `load` reads one key
// (or, for `site_name`/`site_tagline`/`about_md`, the three read together), parsed to
// its domain type at this edge. `store` writes any mix of keys in one round trip (#12).
export interface ISiteConfigAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
