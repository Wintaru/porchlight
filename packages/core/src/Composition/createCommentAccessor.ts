import type { DbClient } from "@porchlight/db";

import { CommentAccessor } from "../Accessors/CommentAccessor/CommentAccessor";
import { FakeCommentState } from "../Accessors/CommentAccessor/FakeCommentState";
import { FakeLoadCommentByIdHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentByIdHandler";
import { FakeLoadCommentsForPostHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentsForPostHandler";
import { FakeRemoveCommentHandler } from "../Accessors/CommentAccessor/Handlers/FakeRemoveCommentHandler";
import { FakeStoreCommentChangesHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreCommentChangesHandler";
import { FakeStoreCommentTombstoneHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreCommentTombstoneHandler";
import { FakeStoreNewCommentHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreNewCommentHandler";
import { SupabaseLoadCommentByIdHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentByIdHandler";
import { SupabaseLoadCommentsForPostHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentsForPostHandler";
import { SupabaseRemoveCommentHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseRemoveCommentHandler";
import { SupabaseStoreCommentChangesHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreCommentChangesHandler";
import { SupabaseStoreCommentTombstoneHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreCommentTombstoneHandler";
import { SupabaseStoreNewCommentHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreNewCommentHandler";
import type { ICommentAccessor } from "../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { LoadCommentsForPostRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentsForPostRequest";
import { RemoveCommentRequest } from "../Accessors/CommentAccessor/Requests/RemoveCommentRequest";
import { StoreCommentChangesRequest } from "../Accessors/CommentAccessor/Requests/StoreCommentChangesRequest";
import { StoreCommentTombstoneRequest } from "../Accessors/CommentAccessor/Requests/StoreCommentTombstoneRequest";
import { StoreNewCommentRequest } from "../Accessors/CommentAccessor/Requests/StoreNewCommentRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every comment read and write (SPEC.md §5).
export function createCommentAccessor(
  env: Environment,
  db: () => DbClient,
): ICommentAccessor {
  switch (readStoreProvider(env, "COMMENT_PROVIDER")) {
    case "supabase":
      return createSupabaseCommentAccessor(db());
    case "fake":
      return createFakeCommentAccessor(
        new FakeCommentState(readFakeResult(env, "COMMENT_FAKE_RESULT") === "fail"),
      );
  }
}

function createSupabaseCommentAccessor(db: DbClient): ICommentAccessor {
  return new CommentAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewCommentRequest, new SupabaseStoreNewCommentHandler(db))
      .register(StoreCommentChangesRequest, new SupabaseStoreCommentChangesHandler(db))
      .register(
        StoreCommentTombstoneRequest,
        new SupabaseStoreCommentTombstoneHandler(db),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCommentByIdRequest, new SupabaseLoadCommentByIdHandler(db))
      .register(LoadCommentsForPostRequest, new SupabaseLoadCommentsForPostHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveCommentRequest, new SupabaseRemoveCommentHandler(db))
      .build(),
  );
}

function createFakeCommentAccessor(state: FakeCommentState): ICommentAccessor {
  return new CommentAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewCommentRequest, new FakeStoreNewCommentHandler(state))
      .register(StoreCommentChangesRequest, new FakeStoreCommentChangesHandler(state))
      .register(StoreCommentTombstoneRequest, new FakeStoreCommentTombstoneHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCommentByIdRequest, new FakeLoadCommentByIdHandler(state))
      .register(LoadCommentsForPostRequest, new FakeLoadCommentsForPostHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveCommentRequest, new FakeRemoveCommentHandler(state))
      .build(),
  );
}
