"use server";

import {
  DeleteMediaRequest,
  FinalizeUploadRequest,
  GetMediaRequest,
  ListMediaRequest,
  MediaDeletedResponse,
  MediaFinalizedResponse,
  MediaForbiddenResponse,
  MediaListResponse,
  MediaRepublishedResponse,
  MediaRefusedResponse,
  MediaResponse,
  NoSuchMediaResponse,
  RepublishMediaRequest,
  RequestUploadUrlRequest,
  UploadUrlIssuedResponse,
} from "@porchlight/core";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { currentRequestMeta } from "@/lib/request-meta";
import { type UploadView, uploadViewOf } from "@/lib/upload-view";
import { mediaErrorTextFor } from "./media-messages";
import type {
  DeleteUploadResult,
  FinalizeUploadResult,
  RequestUploadResult,
  UploadLookup,
} from "./media-results";

const FILENAME_MAX_LENGTH = 255;

// The editor's own attachment panel: request a place to put a file, confirm what the
// browser already put there, list or look up the member's uploads, or remove one
// (SPEC.md §6). Every
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

  const meta = await currentRequestMeta();
  const finalized = await getDependencyContainer().mediaManager.execute(
    new FinalizeUploadRequest(
      actor,
      mediaId,
      originalFilename,
      meta.clientIp,
      meta.userAgent,
    ),
  );
  if (!(finalized instanceof MediaFinalizedResponse)) {
    return { ok: false, error: errorTextFor(finalized) };
  }
  return { ok: true, upload: uploadViewOf(finalized.asset) };
}

// The member's newest uploads, so a file put up before a reload can still go into the
// post (#52). An empty list for anyone else.
export async function listUploads(): Promise<readonly UploadView[]> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return [];
  }
  const response = await getDependencyContainer().mediaManager.query(
    new ListMediaRequest(actor),
  );
  if (!(response instanceof MediaListResponse)) {
    console.error(`upload list failed [${response.correlationId}]`, response);
    return [];
  }
  return response.assets.map(uploadViewOf);
}

// One upload the member may see, for a cover older than the list (#52).
export async function getUpload(mediaId: string): Promise<UploadLookup> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(mediaId)) {
    return { status: "gone" };
  }
  const response = await getDependencyContainer().mediaManager.query(
    new GetMediaRequest(actor, mediaId),
  );
  if (response instanceof MediaResponse) {
    return { status: "found", upload: uploadViewOf(response.asset) };
  }
  if (
    response instanceof NoSuchMediaResponse ||
    response instanceof MediaForbiddenResponse
  ) {
    return { status: "gone" };
  }
  console.error(`upload lookup failed [${response.correlationId}]`, response);
  return { status: "failed" };
}

// Another try at an upload's public copy, after the first one failed (#36).
export async function republishUpload(mediaId: string): Promise<FinalizeUploadResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(mediaId)) {
    return { ok: false, error: mediaErrorTextFor("unavailable") };
  }
  const response = await getDependencyContainer().mediaManager.execute(
    new RepublishMediaRequest(actor, mediaId),
  );
  if (!(response instanceof MediaRepublishedResponse)) {
    return { ok: false, error: errorTextFor(response) };
  }
  return { ok: true, upload: uploadViewOf(response.asset) };
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
  // A locked scan verdict (SPEC.md §7): a plain refusal, not an application error, so
  // this never reaches console.error — that channel is for genuine failures to
  // investigate, and a lock is neither a bug nor something retrying will fix.
  if (response instanceof MediaRefusedResponse) {
    return mediaErrorTextFor("refused");
  }
  if ("reason" in response && typeof response.reason === "string") {
    return mediaErrorTextFor(response.reason);
  }
  console.error(`media action failed [${response.correlationId}]`, response);
  return mediaErrorTextFor("unavailable");
}
