import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Reshapes content by Porchlight's rules (SPEC.md §5, D3): markdown to sanitized HTML,
// a title to a slug. `transform` is the one intent: every request here turns one text
// into another. Pure: no I/O behind it.
export interface IContentRenderEngine {
  transform(request: RequestBase): Promise<ResponseBase>;
}
