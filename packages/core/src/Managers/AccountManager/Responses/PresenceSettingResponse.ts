import { ResponseBase } from "../../../Common/ResponseBase";

export class PresenceSettingResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly visible: boolean,
  ) {
    super(correlationId);
  }
}
