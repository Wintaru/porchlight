import { ResponseBase } from "../../../Common/ResponseBase";

// The consent did not validate: a client id that is not Supabase Auth's shape, or an
// unknown scope.
export class GrantRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly field: "client" | "scopes",
    readonly message: string,
  ) {
    super(correlationId);
  }
}
