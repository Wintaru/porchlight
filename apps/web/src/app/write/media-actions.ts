"use server";

import {
  DeleteMediaRequest,
  FinalizeUploadRequest,
  GetMediaRequest,
  MediaDeletedResponse,
  MediaFinalizedResponse,
  MediaResponse,
  RequestUploadUrlRequest,
  UploadUrlIssuedResponse,
} from "@porchlight/core";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { mediaErrorTextFor } from "./media-messages";
import type {
  DeleteUploadResult,
  FinalizeUploadResult,
  RequestUploadResult,
} from "./media-results";

const FILENAME_MAX_LENGTH = 255;

// The editor's own attachment panel: request a place to put a file, confirm what the
// browser already put there, or remove an upload the member owns (SPEC.md §6). Every
// Manager rule (the allowlist, the quota, the magic-byte check) lives in MediaManager;
// these only parse the form and map the response to what the panel shows.

export async function requestUpload(
  originalFilename: string,
  declaredBytes: number,
): Promise<RequestUploadResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return { ok: false, error: mediaErrorTextFor("signed-out") };
  }
  if (
    originalFilename.length === 0 ||
    originalFilename.length > FILENAME_MAX_LENGTH ||
    !Number.isInteger(declaredBytes) ||
    declaredBytes <= 0
  ) {
    return { ok: false, error: mediaErrorTextFor("unavailable") };
  }

  const response = await getDependencyContainer().mediaManager.execute(
    new RequestUploadUrlRequest(actor, originalFilename, declaredBytes),
  );
  if (!(response instanceof UploadUrlIssuedResponse)) {
    return { ok: false, error: errorTextFor(response) };
  }
  return { ok: true, mediaId: response.mediaId, uploadUrl: response.uploadUrl };
}

export async function finalizeUpload(
  mediaId: string,
  originalFilename: string,
): Promise<FinalizeUploadResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return { ok: false, error: mediaErrorTextFor("signed-out") };
  }
  if (!isEntityId(mediaId)) {
    return { ok: false, error: mediaErrorTextFor("unavailable") };
  }

  const container = getDependencyContainer();
  const finalized = await container.mediaManager.execute(
    new FinalizeUploadRequest(actor, mediaId, originalFilename),
  );
  if (!(finalized instanceof MediaFinalizedResponse)) {
    return { ok: false, error: errorTextFor(finalized) };
  }
  const { asset } = finalized;

  const viewed = await container.mediaManager.query(new GetMediaRequest(actor, mediaId));
  if (!(viewed instanceof MediaResponse)) {
    return { ok: false, error: errorTextFor(viewed) };
  }
  return {
    ok: true,
    mediaId: asset.id,
    originalFilename: asset.originalFilename,
    kind: asset.kind,
    bytes: asset.bytes,
    viewUrl: viewed.downloadUrl,
  };
}

export async function deleteUpload(mediaId: string): Promise<DeleteUploadResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(mediaId)) {
    return { ok: false };
  }
  const response = await getDependencyContainer().mediaManager.execute(
    new DeleteMediaRequest(actor, mediaId),
  );
  return { ok: response instanceof MediaDeletedResponse };
}

function errorTextFor(response: object & { readonly correlationId: string }): string {
  if ("reason" in response && typeof response.reason === "string") {
    return mediaErrorTextFor(response.reason);
  }
  console.error(`media action failed [${response.correlationId}]`, response);
  return mediaErrorTextFor("unavailable");
}
