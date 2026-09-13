import type { ImageClassification } from "../../../Common/ImageClassification";
import type { ModerationThresholds } from "../../../Common/ModerationThresholds";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `imageClassification` is undefined for a non-image attachment (SPEC.md §7): the
// classifier's categories are all visual, so a PDF or a CSV has nothing for it to
// score and skips straight past this rule to `clear`.
export class EvaluateModerationRequest extends RequestBase {
  constructor(
    readonly hashMatched: boolean,
    readonly imageClassification: ImageClassification | undefined,
    readonly thresholds: ModerationThresholds,
    context?: RequestContext,
  ) {
    super(context);
  }
}
