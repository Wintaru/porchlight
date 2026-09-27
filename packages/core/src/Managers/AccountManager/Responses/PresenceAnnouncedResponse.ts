import { ResponseBase } from "../../../Common/ResponseBase";

// `shown` is false when the member turned presence off: the page stops reporting.
export class PresenceAnnouncedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly shown: boolean,
  ) {
    super(correlationId);
  }
}
