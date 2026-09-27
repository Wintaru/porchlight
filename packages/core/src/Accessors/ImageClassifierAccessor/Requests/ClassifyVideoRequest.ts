import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A video, fetched by the provider from `url`, a short-lived signed link to the
// quarantine object (#21). The answer is one classification for the whole video.
export class ClassifyVideoRequest extends RequestBase {
  constructor(
    readonly url: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
