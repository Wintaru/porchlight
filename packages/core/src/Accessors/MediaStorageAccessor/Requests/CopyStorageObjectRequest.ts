import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A server-side copy between buckets: a video's public copy is its quarantine object as
// it is (#21), so the bytes never pass through this server.
export class CopyStorageObjectRequest extends RequestBase {
  constructor(
    readonly fromBucket: string,
    readonly fromPath: string,
    readonly toBucket: string,
    readonly toPath: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
