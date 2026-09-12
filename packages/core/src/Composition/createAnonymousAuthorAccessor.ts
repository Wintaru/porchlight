import type { DbClient } from "@porchlight/db";

import { FakeAnonymousAuthorState } from "../Accessors/AnonymousAuthorAccessor/FakeAnonymousAuthorState";
import { FakeClaimAnonymousAuthorHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/FakeClaimAnonymousAuthorHandler";
import { FakeLoadAnonymousAuthorBySecretHashHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/FakeLoadAnonymousAuthorBySecretHashHandler";
import { FakeLoadAnonymousStatusHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/FakeLoadAnonymousStatusHandler";
import { FakeStoreNewAnonymousAuthorHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/FakeStoreNewAnonymousAuthorHandler";
import { SupabaseClaimAnonymousAuthorHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/SupabaseClaimAnonymousAuthorHandler";
import { SupabaseLoadAnonymousAuthorBySecretHashHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/SupabaseLoadAnonymousAuthorBySecretHashHandler";
import { SupabaseLoadAnonymousStatusHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/SupabaseLoadAnonymousStatusHandler";
import { SupabaseStoreNewAnonymousAuthorHandler } from "../Accessors/AnonymousAuthorAccessor/Handlers/SupabaseStoreNewAnonymousAuthorHandler";
import type { IAnonymousAuthorAccessor } from "../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { AnonymousAuthorAccessor } from "../Accessors/AnonymousAuthorAccessor/AnonymousAuthorAccessor";
import { ClaimAnonymousAuthorRequest } from "../Accessors/AnonymousAuthorAccessor/Requests/ClaimAnonymousAuthorRequest";
import { LoadAnonymousAuthorBySecretHashRequest } from "../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorBySecretHashRequest";
import { LoadAnonymousStatusRequest } from "../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousStatusRequest";
import { StoreNewAnonymousAuthorRequest } from "../Accessors/AnonymousAuthorAccessor/Requests/StoreNewAnonymousAuthorRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the anonymous claim flow (D7).
export function createAnonymousAuthorAccessor(
  env: Environment,
  db: () => DbClient,
): IAnonymousAuthorAccessor {
  switch (readStoreProvider(env, "ANONYMOUS_AUTHOR_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new AnonymousAuthorAccessor(
        new HandlerResolverBuilder()
          .register(
            StoreNewAnonymousAuthorRequest,
            new SupabaseStoreNewAnonymousAuthorHandler(client),
          )
          .register(
            ClaimAnonymousAuthorRequest,
            new SupabaseClaimAnonymousAuthorHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadAnonymousAuthorBySecretHashRequest,
            new SupabaseLoadAnonymousAuthorBySecretHashHandler(client),
          )
          .register(
            LoadAnonymousStatusRequest,
            new SupabaseLoadAnonymousStatusHandler(client),
          )
          .build(),
      );
    }
    case "fake": {
      const state = new FakeAnonymousAuthorState(
        readFakeResult(env, "ANONYMOUS_AUTHOR_FAKE_RESULT") === "fail",
      );
      return new AnonymousAuthorAccessor(
        new HandlerResolverBuilder()
          .register(
            StoreNewAnonymousAuthorRequest,
            new FakeStoreNewAnonymousAuthorHandler(state),
          )
          .register(
            ClaimAnonymousAuthorRequest,
            new FakeClaimAnonymousAuthorHandler(state),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadAnonymousAuthorBySecretHashRequest,
            new FakeLoadAnonymousAuthorBySecretHashHandler(state),
          )
          .register(LoadAnonymousStatusRequest, new FakeLoadAnonymousStatusHandler(state))
          .build(),
      );
    }
  }
}
