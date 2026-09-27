// One email the sweep has claimed for a reader who subscribed by email (#22, D20): the
// posts announced in the window, from the whole site or from one author.
export interface SubscriberEmailClaim {
  readonly subscriberId: string;
  readonly email: string;
  // Null for the whole site.
  readonly authorId: string | null;
  readonly unsubscribeToken: string;
  readonly windowStart: Date;
  readonly windowEnd: Date;
}
