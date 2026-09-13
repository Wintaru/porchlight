import type { SignUpPolicy } from "../../../Common/SignUpPolicy";
import { ResponseBase } from "../../../Common/ResponseBase";

export class SignUpPolicyLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly policy: SignUpPolicy,
  ) {
    super(correlationId);
  }
}
