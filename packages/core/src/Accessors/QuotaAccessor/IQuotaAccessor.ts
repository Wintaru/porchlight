import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `quotas` table (SPEC.md §6). `load` reads a member's running
// total; `store` adjusts it by a delta, positive on a finalized upload and negative on a
// delete. A missing row reads as zero, the same "absent means the default" shape every
// other D20-adjacent store uses.
export interface IQuotaAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
  store(request: RequestBase): Promise<ResponseBase>;
}
