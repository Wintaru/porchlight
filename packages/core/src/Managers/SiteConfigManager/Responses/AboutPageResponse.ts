import { ResponseBase } from "../../../Common/ResponseBase";

// `aboutHtml` is `about_md` through the one render path a post body takes, so it is
// already sanitized. Empty when the admin has not written anything.
export class AboutPageResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly aboutHtml: string,
  ) {
    super(correlationId);
  }
}
