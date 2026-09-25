import type { DbClient } from "@porchlight/db";

import { FakeCreateSignedDownloadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeCreateSignedDownloadUrlHandler";
import { FakeCreateSignedUploadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeCreateSignedUploadUrlHandler";
import { FakeDownloadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeDownloadStorageObjectHandler";
import { FakeRemoveStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectHandler";
import { FakeUploadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeUploadStorageObjectHandler";
import { SupabaseCreateSignedDownloadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseCreateSignedDownloadUrlHandler";
import { SupabaseCreateSignedUploadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseCreateSignedUploadUrlHandler";
import { SupabaseDownloadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseDownloadStorageObjectHandler";
import { SupabaseRemoveStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseRemoveStorageObjectHandler";
import { SupabaseUploadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseUploadStorageObjectHandler";
import { FakeMediaStorageState } from "../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import type { IMediaStorageAccessor } from "../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { MediaStorageAccessor } from "../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { CreateSignedDownloadUrlRequest } from "../Accessors/MediaStorageAccessor/Requests/CreateSignedDownloadUrlRequest";
import { CreateSignedUploadUrlRequest } from "../Accessors/MediaStorageAccessor/Requests/CreateSignedUploadUrlRequest";
import { DownloadStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { UploadStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/UploadStorageObjectRequest";
import type { DutyChecklistItem } from "../Common/DutyChecklistItem";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind Supabase Storage (SPEC.md §6, D4).
export function createMediaStorageAccessor(
  env: Environment,
  db: () => DbClient,
): IMediaStorageAccessor {
  switch (readStoreProvider(env, "MEDIA_STORAGE_PROVIDER")) {
    case "supabase":
      return createSupabaseMediaStorageAccessor(db());
    case "fake":
      return createFakeMediaStorageAccessor(
        new FakeMediaStorageState(
          readFakeResult(env, "MEDIA_STORAGE_FAKE_RESULT") === "fail",
        ),
      );
  }
}

function createSupabaseMediaStorageAccessor(db: DbClient): IMediaStorageAccessor {
  return new MediaStorageAccessor(
    new HandlerResolverBuilder()
      .register(
        CreateSignedUploadUrlRequest,
        new SupabaseCreateSignedUploadUrlHandler(db),
      )
      .register(UploadStorageObjectRequest, new SupabaseUploadStorageObjectHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(
        DownloadStorageObjectRequest,
        new SupabaseDownloadStorageObjectHandler(db),
      )
      .register(
        CreateSignedDownloadUrlRequest,
        new SupabaseCreateSignedDownloadUrlHandler(db),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveStorageObjectRequest, new SupabaseRemoveStorageObjectHandler(db))
      .build(),
  );
}

function createFakeMediaStorageAccessor(
  state: FakeMediaStorageState,
): IMediaStorageAccessor {
  return new MediaStorageAccessor(
    new HandlerResolverBuilder()
      .register(CreateSignedUploadUrlRequest, new FakeCreateSignedUploadUrlHandler(state))
      .register(UploadStorageObjectRequest, new FakeUploadStorageObjectHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(DownloadStorageObjectRequest, new FakeDownloadStorageObjectHandler(state))
      .register(
        CreateSignedDownloadUrlRequest,
        new FakeCreateSignedDownloadUrlHandler(state),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveStorageObjectRequest, new FakeRemoveStorageObjectHandler(state))
      .build(),
  );
}

// The duty checklist's row for this provider (SPEC.md §7, #12): reads the same
// MEDIA_STORAGE_PROVIDER switch the factory above does, so the two cannot drift.
export function mediaStorageDutyStatus(env: Environment): DutyChecklistItem {
  const provider = env.MEDIA_STORAGE_PROVIDER ?? "supabase";
  return {
    id: "media-storage",
    label: "Media storage (uploads and quarantine)",
    status:
      provider !== "fake"
        ? "configured"
        : env.NODE_ENV === "production"
          ? "fakeInProduction"
          : "fake",
    setupGuidePath: "docs/setup/storage.md",
  };
}
