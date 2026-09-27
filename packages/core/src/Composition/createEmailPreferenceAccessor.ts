import type { DbClient } from "@porchlight/db";

import { EmailPreferenceAccessor } from "../Accessors/EmailPreferenceAccessor/EmailPreferenceAccessor";
import { FakeEmailPreferenceState } from "../Accessors/EmailPreferenceAccessor/FakeEmailPreferenceState";
import { FakeClaimMemberEmailsHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/FakeClaimMemberEmailsHandler";
import { FakeLoadEmailPreferenceHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/FakeLoadEmailPreferenceHandler";
import { FakeReleaseMemberEmailHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/FakeReleaseMemberEmailHandler";
import { FakeStoreEmailPreferenceHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/FakeStoreEmailPreferenceHandler";
import { FakeStoreMemberUnsubscribeHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/FakeStoreMemberUnsubscribeHandler";
import { SupabaseClaimMemberEmailsHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/SupabaseClaimMemberEmailsHandler";
import { SupabaseLoadEmailPreferenceHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/SupabaseLoadEmailPreferenceHandler";
import { SupabaseReleaseMemberEmailHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/SupabaseReleaseMemberEmailHandler";
import { SupabaseStoreEmailPreferenceHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/SupabaseStoreEmailPreferenceHandler";
import { SupabaseStoreMemberUnsubscribeHandler } from "../Accessors/EmailPreferenceAccessor/Handlers/SupabaseStoreMemberUnsubscribeHandler";
import type { IEmailPreferenceAccessor } from "../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { ClaimMemberEmailsRequest } from "../Accessors/EmailPreferenceAccessor/Requests/ClaimMemberEmailsRequest";
import { LoadEmailPreferenceRequest } from "../Accessors/EmailPreferenceAccessor/Requests/LoadEmailPreferenceRequest";
import { ReleaseMemberEmailRequest } from "../Accessors/EmailPreferenceAccessor/Requests/ReleaseMemberEmailRequest";
import { StoreEmailPreferenceRequest } from "../Accessors/EmailPreferenceAccessor/Requests/StoreEmailPreferenceRequest";
import { StoreMemberUnsubscribeRequest } from "../Accessors/EmailPreferenceAccessor/Requests/StoreMemberUnsubscribeRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind member email settings and the digest sweep's claims (#22).
export function createEmailPreferenceAccessor(
  env: Environment,
  db: () => DbClient,
): IEmailPreferenceAccessor {
  switch (readStoreProvider(env, "EMAIL_PREFERENCE_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new EmailPreferenceAccessor(
        new HandlerResolverBuilder()
          .register(
            LoadEmailPreferenceRequest,
            new SupabaseLoadEmailPreferenceHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            StoreEmailPreferenceRequest,
            new SupabaseStoreEmailPreferenceHandler(client),
          )
          .register(
            ClaimMemberEmailsRequest,
            new SupabaseClaimMemberEmailsHandler(client),
          )
          .register(
            ReleaseMemberEmailRequest,
            new SupabaseReleaseMemberEmailHandler(client),
          )
          .register(
            StoreMemberUnsubscribeRequest,
            new SupabaseStoreMemberUnsubscribeHandler(client),
          )
          .build(),
      );
    }
    case "fake":
      return createFakeEmailPreferenceAccessor(
        new FakeEmailPreferenceState(
          readFakeResult(env, "EMAIL_PREFERENCE_FAKE_RESULT") === "fail",
        ),
      );
  }
}

// Exported so a Manager test can set up what the sweep finds due.
export function createFakeEmailPreferenceAccessor(
  state: FakeEmailPreferenceState,
): IEmailPreferenceAccessor {
  return new EmailPreferenceAccessor(
    new HandlerResolverBuilder()
      .register(LoadEmailPreferenceRequest, new FakeLoadEmailPreferenceHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(StoreEmailPreferenceRequest, new FakeStoreEmailPreferenceHandler(state))
      .register(ClaimMemberEmailsRequest, new FakeClaimMemberEmailsHandler(state))
      .register(ReleaseMemberEmailRequest, new FakeReleaseMemberEmailHandler(state))
      .register(
        StoreMemberUnsubscribeRequest,
        new FakeStoreMemberUnsubscribeHandler(state),
      )
      .build(),
  );
}
