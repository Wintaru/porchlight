import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for Supabase Storage (SPEC.md §6, D4). `store` issues a signed
// upload URL, or writes a server-made object (a published copy, #36); `load` reads an object back (its bytes, for the server-side magic-byte
// check, or a signed URL for a browser); `remove` deletes an object. Phase 1's one
// implementation; #21 may add or swap the provider behind this same interface.
export interface IMediaStorageAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
  remove(request: RequestBase): Promise<ResponseBase>;
}
