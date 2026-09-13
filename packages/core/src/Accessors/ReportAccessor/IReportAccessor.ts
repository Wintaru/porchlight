import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `reports` (SPEC.md §7). `store` files a report or resolves the
// open ones on a target; `load` lists them for the ListReports query.
export interface IReportAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
