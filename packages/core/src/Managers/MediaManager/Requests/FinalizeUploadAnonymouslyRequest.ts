import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Confirms what a visitor's browser already put at the signed URL. No actor: holding
// the `porchlight_anon` cookie is the only proof of ownership an anonymous author has
// (the same shape `GetAnonymousStatusRequest` uses) — re-running the full D15 guard
// here would mean a second Turnstile solve for a write already admitted at request
// time, so this only re-identifies the author by secret.
export class FinalizeUploadAnonymouslyRequest extends RequestBase {
  constructor(
    readonly mediaId: string,
    readonly originalFilename: string,
    readonly secret: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
