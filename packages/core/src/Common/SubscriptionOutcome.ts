// What asking to subscribe did (#22): a confirmation email is due (`pending`), one went
// out minutes ago (`recent`), or the address already confirmed (`confirmed`). For the
// server only: the page says the same thing in every case, so nobody learns whether an
// address is subscribed.
export type SubscriptionOutcome = "pending" | "recent" | "confirmed";
