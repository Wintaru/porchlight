import type { DbClient } from "@porchlight/db";

import { FakeSubscriberState } from "../Accessors/SubscriberAccessor/FakeSubscriberState";
import { FakeClaimSubscriberEmailsHandler } from "../Accessors/SubscriberAccessor/Handlers/FakeClaimSubscriberEmailsHandler";
import { FakeReleaseSubscriberEmailHandler } from "../Accessors/SubscriberAccessor/Handlers/FakeReleaseSubscriberEmailHandler";
import { FakeRemoveSubscriberHandler } from "../Accessors/SubscriberAccessor/Handlers/FakeRemoveSubscriberHandler";
import { FakeStorePendingSubscriptionHandler } from "../Accessors/SubscriberAccessor/Handlers/FakeStorePendingSubscriptionHandler";
import { FakeStoreSubscriptionConfirmationHandler } from "../Accessors/SubscriberAccessor/Handlers/FakeStoreSubscriptionConfirmationHandler";
import { SupabaseClaimSubscriberEmailsHandler } from "../Accessors/SubscriberAccessor/Handlers/SupabaseClaimSubscriberEmailsHandler";
import { SupabaseReleaseSubscriberEmailHandler } from "../Accessors/SubscriberAccessor/Handlers/SupabaseReleaseSubscriberEmailHandler";
import { SupabaseRemoveSubscriberHandler } from "../Accessors/SubscriberAccessor/Handlers/SupabaseRemoveSubscriberHandler";
import { SupabaseStorePendingSubscriptionHandler } from "../Accessors/SubscriberAccessor/Handlers/SupabaseStorePendingSubscriptionHandler";
import { SupabaseStoreSubscriptionConfirmationHandler } from "../Accessors/SubscriberAccessor/Handlers/SupabaseStoreSubscriptionConfirmationHandler";
import type { ISubscriberAccessor } from "../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { ClaimSubscriberEmailsRequest } from "../Accessors/SubscriberAccessor/Requests/ClaimSubscriberEmailsRequest";
import { ReleaseSubscriberEmailRequest } from "../Accessors/SubscriberAccessor/Requests/ReleaseSubscriberEmailRequest";
import { RemoveSubscriberRequest } from "../Accessors/SubscriberAccessor/Requests/RemoveSubscriberRequest";
import { StorePendingSubscriptionRequest } from "../Accessors/SubscriberAccessor/Requests/StorePendingSubscriptionRequest";
import { StoreSubscriptionConfirmationRequest } from "../Accessors/SubscriberAccessor/Requests/StoreSubscriptionConfirmationRequest";
import { SubscriberAccessor } from "../Accessors/SubscriberAccessor/SubscriberAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind reader subscriptions by email (#22, D20).
export function createSubscriberAccessor(
  env: Environment,
  db: () => DbClient,
): ISubscriberAccessor {
  switch (readStoreProvider(env, "SUBSCRIBER_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new SubscriberAccessor(
        new HandlerResolverBuilder()
          .register(
            StorePendingSubscriptionRequest,
            new SupabaseStorePendingSubscriptionHandler(client),
          )
          .register(
            StoreSubscriptionConfirmationRequest,
            new SupabaseStoreSubscriptionConfirmationHandler(client),
          )
          .register(
            ClaimSubscriberEmailsRequest,
            new SupabaseClaimSubscriberEmailsHandler(client),
          )
          .register(
            ReleaseSubscriberEmailRequest,
            new SupabaseReleaseSubscriberEmailHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveSubscriberRequest, new SupabaseRemoveSubscriberHandler(client))
          .build(),
      );
    }
    case "fake":
      return createFakeSubscriberAccessor(
        new FakeSubscriberState(readFakeResult(env, "SUBSCRIBER_FAKE_RESULT") === "fail"),
      );
  }
}

// Exported so a Manager test can set up what the sweep finds due.
export function createFakeSubscriberAccessor(
  state: FakeSubscriberState,
): ISubscriberAccessor {
  return new SubscriberAccessor(
    new HandlerResolverBuilder()
      .register(
        StorePendingSubscriptionRequest,
        new FakeStorePendingSubscriptionHandler(state),
      )
      .register(
        StoreSubscriptionConfirmationRequest,
        new FakeStoreSubscriptionConfirmationHandler(state),
      )
      .register(ClaimSubscriberEmailsRequest, new FakeClaimSubscriberEmailsHandler(state))
      .register(
        ReleaseSubscriberEmailRequest,
        new FakeReleaseSubscriberEmailHandler(state),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveSubscriberRequest, new FakeRemoveSubscriberHandler(state))
      .build(),
  );
}
