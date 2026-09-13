import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for known-illegal image fingerprint matching (SPEC.md §7, WAYFINDER
// D17). Default provider is Project Arachnid's Shield; PhotoDNA and Cloudflare's tool
// are alternate slots for later. `load` answers whether the image matched, never a
// score: a match from this class of service is treated as high-confidence by design.
export interface IHashMatchAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
}
