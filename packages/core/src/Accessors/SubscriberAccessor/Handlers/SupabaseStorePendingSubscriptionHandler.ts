import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { SubscriptionOutcome } from "../../../Common/SubscriptionOutcome";
import type { StorePendingSubscriptionRequest } from "../Requests/StorePendingSubscriptionRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriptionAskedResponse } from "../Responses/SubscriptionAskedResponse";

const OUTCOMES: readonly SubscriptionOutcome[] = ["pending", "recent", "confirmed"];

function isOutcome(value: unknown): value is SubscriptionOutcome {
  return OUTCOMES.some((outcome) => outcome === value);
}

export class SupabaseStorePendingSubscriptionHandler implements IHandler<
  StorePendingSubscriptionRequest,
  SubscriptionAskedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StorePendingSubscriptionRequest,
  ): Promise<SubscriptionAskedResponse | SubscriberAccessFailedResponse> {
    const { email, authorId, digest, confirmToken, correlationId } = request;
    const { data, error } = await this.db.rpc("request_subscription", {
      p_email: email,
      p_digest: digest,
      p_confirm_token: confirmToken,
      ...(authorId === null ? {} : { p_author_id: authorId }),
    });
    if (error) {
      return new SubscriberAccessFailedResponse(correlationId, error.message);
    }
    if (!isOutcome(data)) {
      return new SubscriberAccessFailedResponse(
        correlationId,
        `request_subscription answered ${data}`,
      );
    }
    return new SubscriptionAskedResponse(correlationId, data);
  }
}
