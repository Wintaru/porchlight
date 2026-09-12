import type { AnonymousStatusItem } from "../../../Common/AnonymousStatusItem";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AnonymousStatusLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly items: readonly AnonymousStatusItem[],
  ) {
    super(correlationId);
  }
}
