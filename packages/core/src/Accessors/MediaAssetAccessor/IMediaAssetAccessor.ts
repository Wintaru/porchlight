import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `media_assets` table (SPEC.md §6, §7). `store` writes,
// `load` reads (by id, and the anonymous-author count QuotaEngine's caller needs),
// `remove` deletes. The Supabase and fake handlers share the Requests/ and Responses/
// next to this file, so a Manager cannot tell them apart (D19).
export interface IMediaAssetAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
