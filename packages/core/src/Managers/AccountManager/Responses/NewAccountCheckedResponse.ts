import { ResponseBase } from "../../../Common/ResponseBase";

// `allowed` is true when sign-up is open, or when the address is the site's admin.
export class NewAccountCheckedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly allowed: boolean,
  ) {
    super(correlationId);
  }
}
