import { ResponseBase } from "../../../Common/ResponseBase";
import type { StorageReadLink } from "../StorageReadLink";

export class StorageReadOpenedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly link: StorageReadLink,
  ) {
    super(correlationId);
  }
}
