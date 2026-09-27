"use server";

import {
  type Actor,
  AttachMediaToPostRequest,
  type ConvertedSource,
  DeleteMediaRequest,
  FinalizeUploadRequest,
  GetMediaRequest,
  ListMediaRequest,
  MediaAttachedResponse,
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
import { isMediaErrorCode, mediaErrorTextFor } from "./media-messages";
import type {
  DeleteUploadResult,
  FinalizeUploadResult,
  RequestUploadResult,
  UploadLookup,
} from "./media-results";

const FILENAME_MAX_LENGTH = 255;

// A server action's arguments arrive from the browser unchecked.
function isConvertedSource(value: unknown): value is ConvertedSource | null {
  if (value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false;
  }
  const { filename, bytes } = value as Record<string, unknown>;
  return (
    typeof filename === "string" &&
    filename.length > 0 &&
    filename.length <= FILENAME_MAX_LENGTH &&
    typeof bytes === "number" &&
    Number.isSafeInteger(bytes) &&
    bytes > 0
  );
}

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

// `convertedFrom` is the phone's file a video was converted from in the browser (#21),
// for the evidence envelope. `postId` is the post the editor is on, once it has one:
// the upload joins it (#80).
export async function finalizeUpload(
  mediaId: string,
  originalFilename: string,
  convertedFrom: ConvertedSource | null = null,
  postId: string | null = null,
): Promise<FinalizeUploadResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return { ok: false, error: mediaErrorTextFor("signed-out") };
  }
  if (
    !isEntityId(mediaId) ||
    !isConvertedSource(convertedFrom) ||
    (postId !== null && !isEntityId(postId))
  ) {
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
      convertedFrom,
    ),
  );
  if (!(finalized instanceof MediaFinalizedResponse)) {
    return { ok: false, error: errorTextFor(finalized) };
  }
  if (postId !== null) {
    await attach(actor, mediaId, postId);
  }
  return { ok: true, upload: uploadViewOf(finalized.asset, finalized.unpublishable) };
}

// An upload made before the new post had an id joins it once it has one (#80).
export async function attachUpload(mediaId: string, postId: string): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(mediaId) || !isEntityId(postId)) {
    return;
  }
  await attach(actor, mediaId, postId);
}

// A failed attach leaves the upload with no post, where a save that puts it in the body
// attaches it anyway, so it is logged and not shown.
async function attach(
  actor: Actor & { kind: "member" },
  mediaId: string,
  postId: string,
): Promise<void> {
  const response = await getDependencyContainer().mediaManager.execute(
    new AttachMediaToPostRequest(actor, mediaId, postId),
  );
  if (!(response instanceof MediaAttachedResponse)) {
    console.error(`upload attach failed [${response.correlationId}]`, response);
  }
}

// This post's uploads, so a file put up before a reload can still go into it (#52,
// #80). An empty list for anyone else, and for a post not saved yet.
export async function listUploads(postId: string): Promise<readonly UploadView[]> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(postId)) {
    return [];
  }
  const response = await getDependencyContainer().mediaManager.query(
    new ListMediaRequest(actor, postId),
  );
  if (!(response instanceof MediaListResponse)) {
    console.error(`upload list failed [${response.correlationId}]`, response);
    return [];
  }
  return response.assets.map((asset) => uploadViewOf(asset));
}

// The member's uploads that are in no post: made before a new post had an id, older
// than posts owning uploads (#80), or left by a post someone else deleted. Listed so the
// member can still put one in, or remove it and free the space.
export async function listUnattachedUploads(): Promise<readonly UploadView[]> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return [];
  }
  const response = await getDependencyContainer().mediaManager.query(
    new ListMediaRequest(actor, null),
  );
  if (!(response instanceof MediaListResponse)) {
    console.error(`unattached upload list failed [${response.correlationId}]`, response);
    return [];
  }
  return response.assets.map((asset) => uploadViewOf(asset));
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
  return { ok: true, upload: uploadViewOf(response.asset, response.unpublishable) };
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
  // A reason with a sentence of its own is the uploader's to fix. Any other reason,
  // such as a scanner that did not answer, is logged: the uploader sees only "try
  // again", so the log is the only place the cause shows.
  if (
    "reason" in response &&
    typeof response.reason === "string" &&
    isMediaErrorCode(response.reason)
  ) {
    return mediaErrorTextFor(response.reason);
  }
  console.error(`media action failed [${response.correlationId}]`, response);
  return mediaErrorTextFor("unavailable");
}
