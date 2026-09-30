import type { DbClient } from "@porchlight/db";

import { FakeCreateSignedDownloadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeCreateSignedDownloadUrlHandler";
import { FakeCreateSignedUploadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeCreateSignedUploadUrlHandler";
import { FakeDownloadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeDownloadStorageObjectHandler";
import { FakeRemoveStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectHandler";
import { FakeRemoveStorageObjectsHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectsHandler";
import { FakeUploadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeUploadStorageObjectHandler";
import { SupabaseCreateSignedDownloadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseCreateSignedDownloadUrlHandler";
import { SupabaseCreateSignedUploadUrlHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseCreateSignedUploadUrlHandler";
import { SupabaseDownloadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseDownloadStorageObjectHandler";
import { SupabaseRemoveStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseRemoveStorageObjectHandler";
import { SupabaseRemoveStorageObjectsHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseRemoveStorageObjectsHandler";
import { SupabaseUploadStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseUploadStorageObjectHandler";
import { FakeMediaStorageState } from "../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import type { IMediaStorageAccessor } from "../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { MediaStorageAccessor } from "../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { CreateSignedDownloadUrlRequest } from "../Accessors/MediaStorageAccessor/Requests/CreateSignedDownloadUrlRequest";
import { CreateSignedUploadUrlRequest } from "../Accessors/MediaStorageAccessor/Requests/CreateSignedUploadUrlRequest";
import { DownloadStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { RemoveStorageObjectsRequest } from "../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectsRequest";
import { UploadStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/UploadStorageObjectRequest";
import { FakeLoadStorageObjectInfoHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeLoadStorageObjectInfoHandler";
import { SupabaseLoadStorageObjectInfoHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseLoadStorageObjectInfoHandler";
import { LoadStorageObjectInfoRequest } from "../Accessors/MediaStorageAccessor/Requests/LoadStorageObjectInfoRequest";
import { FakeDownloadStorageObjectRangeHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeDownloadStorageObjectRangeHandler";
import { SupabaseDownloadStorageObjectRangeHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseDownloadStorageObjectRangeHandler";
import { DownloadStorageObjectRangeRequest } from "../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRangeRequest";
import { FakeDigestStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeDigestStorageObjectHandler";
import { SupabaseDigestStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseDigestStorageObjectHandler";
import { DigestStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/DigestStorageObjectRequest";
import { FakeOpenStorageReadHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeOpenStorageReadHandler";
import { SupabaseOpenStorageReadHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseOpenStorageReadHandler";
import { OpenStorageReadRequest } from "../Accessors/MediaStorageAccessor/Requests/OpenStorageReadRequest";
import { FakeCopyStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/FakeCopyStorageObjectHandler";
import { SupabaseCopyStorageObjectHandler } from "../Accessors/MediaStorageAccessor/Handlers/SupabaseCopyStorageObjectHandler";
import { CopyStorageObjectRequest } from "../Accessors/MediaStorageAccessor/Requests/CopyStorageObjectRequest";
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
      .register(CopyStorageObjectRequest, new SupabaseCopyStorageObjectHandler(db))
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
      .register(
        LoadStorageObjectInfoRequest,
        new SupabaseLoadStorageObjectInfoHandler(db),
      )
      .register(OpenStorageReadRequest, new SupabaseOpenStorageReadHandler(db))
      .register(
        DownloadStorageObjectRangeRequest,
        new SupabaseDownloadStorageObjectRangeHandler(),
      )
      .register(DigestStorageObjectRequest, new SupabaseDigestStorageObjectHandler())
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveStorageObjectRequest, new SupabaseRemoveStorageObjectHandler(db))
      .register(RemoveStorageObjectsRequest, new SupabaseRemoveStorageObjectsHandler(db))
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
      .register(CopyStorageObjectRequest, new FakeCopyStorageObjectHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(DownloadStorageObjectRequest, new FakeDownloadStorageObjectHandler(state))
      .register(
        CreateSignedDownloadUrlRequest,
        new FakeCreateSignedDownloadUrlHandler(state),
      )
      .register(LoadStorageObjectInfoRequest, new FakeLoadStorageObjectInfoHandler(state))
      .register(OpenStorageReadRequest, new FakeOpenStorageReadHandler(state))
      .register(
        DownloadStorageObjectRangeRequest,
        new FakeDownloadStorageObjectRangeHandler(state),
      )
      .register(DigestStorageObjectRequest, new FakeDigestStorageObjectHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveStorageObjectRequest, new FakeRemoveStorageObjectHandler(state))
      .register(RemoveStorageObjectsRequest, new FakeRemoveStorageObjectsHandler(state))
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
