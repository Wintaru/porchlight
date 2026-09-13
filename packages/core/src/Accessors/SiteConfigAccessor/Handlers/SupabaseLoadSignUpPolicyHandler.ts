import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import {
  DEFAULT_SIGN_UP_POLICY,
  SIGN_UP_POLICIES,
  type SignUpPolicy,
} from "../../../Common/SignUpPolicy";
import type { LoadSignUpPolicyRequest } from "../Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../Responses/SignUpPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const SIGN_UP_KEY = "sign_up";

function isSignUpPolicy(value: unknown): value is SignUpPolicy {
  return SIGN_UP_POLICIES.some((policy) => policy === value);
}

// The value column is jsonb; the key holds a JSON string. An absent row is the default
// (the key is seeded by #12), an unknown value is a failure, never a silent default.
export class SupabaseLoadSignUpPolicyHandler implements IHandler<
  LoadSignUpPolicyRequest,
  SignUpPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadSignUpPolicyRequest,
  ): Promise<SignUpPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", SIGN_UP_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new SignUpPolicyLoadedResponse(
        request.correlationId,
        DEFAULT_SIGN_UP_POLICY,
      );
    }
    if (!isSignUpPolicy(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${SIGN_UP_KEY} holds ${JSON.stringify(data.value)}, not one of ${SIGN_UP_POLICIES.join(", ")}`,
      );
    }
    return new SignUpPolicyLoadedResponse(request.correlationId, data.value);
  }
}
