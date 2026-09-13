import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// What the Client sees. `execute` changes state (save, apply a preset), `query` only
// reads the current snapshot and duty checklist (SPEC.md §3).
export interface ISiteConfigManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
