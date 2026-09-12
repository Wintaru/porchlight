import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for Cloudflare Turnstile (D15). `load` verifies one token against
// the vendor and answers whether the challenge passed. Empty keys select the fake
// provider (D19, docs/setup/turnstile.md).
export interface ITurnstileAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
}
