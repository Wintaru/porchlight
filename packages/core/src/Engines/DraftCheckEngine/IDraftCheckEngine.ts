import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The draft check (SPEC.md §17, #32): cheap, deterministic heuristics over a markdown
// draft. No vendor, no model, no I/O (D19).
export interface IDraftCheckEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
