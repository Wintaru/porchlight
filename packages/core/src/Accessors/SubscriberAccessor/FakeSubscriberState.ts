import type { DigestSchedule } from "../../Common/DigestSchedule";
import type { SubscriberEmailClaim } from "../../Common/SubscriberEmailClaim";

export interface FakeSubscriber {
  readonly email: string;
  readonly authorId: string | null;
  readonly digest: DigestSchedule;
  readonly confirmToken: string | null;
  readonly confirmed: boolean;
  readonly unsubscribeToken: string;
}

// The fake's `subscribers`, keyed by address and scope. It has no posts to look at, so
// what the sweep would find due is set up front in `due`, as in FakeEmailPreferenceState.
// `failing` makes every call answer SubscriberAccessFailedResponse, for the error path.
export class FakeSubscriberState {
  readonly subscribers = new Map<string, FakeSubscriber>();
  due: SubscriberEmailClaim[] = [];
  readonly released: SubscriberEmailClaim[] = [];

  constructor(readonly failing = false) {}

  static keyOf(email: string, authorId: string | null): string {
    return `${email}:${authorId ?? "site"}`;
  }
}
