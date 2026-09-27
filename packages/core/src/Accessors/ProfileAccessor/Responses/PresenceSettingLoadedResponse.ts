import { ResponseBase } from "../../../Common/ResponseBase";

export class PresenceSettingLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly visible: boolean,
  ) {
    super(correlationId);
  }
}
