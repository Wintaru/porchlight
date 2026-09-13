import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the purpose-built image classifier (SPEC.md §7, WAYFINDER D17):
// Hive or Sightengine, scoring violence, gore, sexual content, self-harm and minors. A
// general-purpose LLM API never receives an image — that rule is why this accessor
// exists separately from TextModerationAccessor's slot rather than sharing one.
export interface IImageClassifierAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
}
