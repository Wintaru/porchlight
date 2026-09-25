import type { DbClient } from "@porchlight/db";

import { CommentAccessor } from "../Accessors/CommentAccessor/CommentAccessor";
import { FakeCommentState } from "../Accessors/CommentAccessor/FakeCommentState";
import { FakeLoadCommentByIdHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentByIdHandler";
import { FakeLoadCommentsByAuthorHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentsByAuthorHandler";
import { FakeLoadCommentsByStatusHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentsByStatusHandler";
import { FakeLoadCommentsForPostHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentsForPostHandler";
import { FakeRemoveCommentHandler } from "../Accessors/CommentAccessor/Handlers/FakeRemoveCommentHandler";
import { FakeStoreCommentChangesHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreCommentChangesHandler";
import { FakeStoreCommentStatusHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreCommentStatusHandler";
import { FakeStoreCommentTombstoneHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreCommentTombstoneHandler";
import { FakeStoreNewCommentHandler } from "../Accessors/CommentAccessor/Handlers/FakeStoreNewCommentHandler";
import { SupabaseLoadCommentByIdHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentByIdHandler";
import { SupabaseLoadCommentsByAuthorHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentsByAuthorHandler";
import { SupabaseLoadCommentsByStatusHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentsByStatusHandler";
import { SupabaseLoadCommentsForPostHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentsForPostHandler";
import { SupabaseRemoveCommentHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseRemoveCommentHandler";
import { SupabaseStoreCommentChangesHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreCommentChangesHandler";
import { SupabaseStoreCommentStatusHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreCommentStatusHandler";
import { SupabaseStoreCommentTombstoneHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreCommentTombstoneHandler";
import { SupabaseStoreNewCommentHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseStoreNewCommentHandler";
import type { ICommentAccessor } from "../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { LoadCommentsByIdsRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentsByIdsRequest";
import { FakeLoadCommentsByIdsHandler } from "../Accessors/CommentAccessor/Handlers/FakeLoadCommentsByIdsHandler";
import { SupabaseLoadCommentsByIdsHandler } from "../Accessors/CommentAccessor/Handlers/SupabaseLoadCommentsByIdsHandler";
import { LoadCommentsByAuthorRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentsByAuthorRequest";
import { LoadCommentsForPostRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentsForPostRequest";
import { LoadCommentsByStatusRequest } from "../Accessors/CommentAccessor/Requests/LoadCommentsByStatusRequest";
import { RemoveCommentRequest } from "../Accessors/CommentAccessor/Requests/RemoveCommentRequest";
import { StoreCommentChangesRequest } from "../Accessors/CommentAccessor/Requests/StoreCommentChangesRequest";
import { StoreCommentStatusRequest } from "../Accessors/CommentAccessor/Requests/StoreCommentStatusRequest";
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
      .register(StoreCommentStatusRequest, new SupabaseStoreCommentStatusHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCommentByIdRequest, new SupabaseLoadCommentByIdHandler(db))
      .register(LoadCommentsByIdsRequest, new SupabaseLoadCommentsByIdsHandler(db))
      .register(LoadCommentsForPostRequest, new SupabaseLoadCommentsForPostHandler(db))
      .register(LoadCommentsByStatusRequest, new SupabaseLoadCommentsByStatusHandler(db))
      .register(LoadCommentsByAuthorRequest, new SupabaseLoadCommentsByAuthorHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveCommentRequest, new SupabaseRemoveCommentHandler(db))
      .build(),
  );
}

export function createFakeCommentAccessor(state: FakeCommentState): ICommentAccessor {
  return new CommentAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewCommentRequest, new FakeStoreNewCommentHandler(state))
      .register(StoreCommentChangesRequest, new FakeStoreCommentChangesHandler(state))
      .register(StoreCommentTombstoneRequest, new FakeStoreCommentTombstoneHandler(state))
      .register(StoreCommentStatusRequest, new FakeStoreCommentStatusHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCommentByIdRequest, new FakeLoadCommentByIdHandler(state))
      .register(LoadCommentsByIdsRequest, new FakeLoadCommentsByIdsHandler(state))
      .register(LoadCommentsForPostRequest, new FakeLoadCommentsForPostHandler(state))
      .register(LoadCommentsByStatusRequest, new FakeLoadCommentsByStatusHandler(state))
      .register(LoadCommentsByAuthorRequest, new FakeLoadCommentsByAuthorHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveCommentRequest, new FakeRemoveCommentHandler(state))
      .build(),
  );
}
