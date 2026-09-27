import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { Mp4Layout, Mp4Movie } from "../../../Utilities/media/mp4Movie";

// What the Manager read from a video (Utilities/media/mp4Movie.ts): its movie box, and
// its top-level boxes in order. Either is undefined when that part does not parse, or
// the file has no movie box ahead of its media.
export class EvaluateVideoRequest extends RequestBase {
  constructor(
    readonly movie: Mp4Movie | undefined,
    readonly layout: Mp4Layout | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
