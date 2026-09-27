import type { DbClient } from "@porchlight/db";

import { FakeTagState } from "../Accessors/TagAccessor/FakeTagState";
import { FakeLoadTagDescriptionHandler } from "../Accessors/TagAccessor/Handlers/FakeLoadTagDescriptionHandler";
import { FakeStoreTagDescriptionHandler } from "../Accessors/TagAccessor/Handlers/FakeStoreTagDescriptionHandler";
import { SupabaseLoadTagDescriptionHandler } from "../Accessors/TagAccessor/Handlers/SupabaseLoadTagDescriptionHandler";
import { SupabaseStoreTagDescriptionHandler } from "../Accessors/TagAccessor/Handlers/SupabaseStoreTagDescriptionHandler";
import type { ITagAccessor } from "../Accessors/TagAccessor/ITagAccessor";
import { LoadTagDescriptionRequest } from "../Accessors/TagAccessor/Requests/LoadTagDescriptionRequest";
import { StoreTagDescriptionRequest } from "../Accessors/TagAccessor/Requests/StoreTagDescriptionRequest";
import { TagAccessor } from "../Accessors/TagAccessor/TagAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind a tag's description (#24).
export function createTagAccessor(env: Environment, db: () => DbClient): ITagAccessor {
  switch (readStoreProvider(env, "TAG_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new TagAccessor(
        new HandlerResolverBuilder()
          .register(
            LoadTagDescriptionRequest,
            new SupabaseLoadTagDescriptionHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            StoreTagDescriptionRequest,
            new SupabaseStoreTagDescriptionHandler(client),
          )
          .build(),
      );
    }
    case "fake": {
      const state = new FakeTagState(readFakeResult(env, "TAG_FAKE_RESULT") === "fail");
      return new TagAccessor(
        new HandlerResolverBuilder()
          .register(LoadTagDescriptionRequest, new FakeLoadTagDescriptionHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(StoreTagDescriptionRequest, new FakeStoreTagDescriptionHandler(state))
          .build(),
      );
    }
  }
}
