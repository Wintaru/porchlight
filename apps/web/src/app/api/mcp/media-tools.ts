import {
  type MediaAsset,
  MediaForbiddenResponse,
  MediaQuotaExceededResponse,
  MediaRefusedResponse,
  MediaRejectedResponse,
  NoSuchMediaResponse,
  type ResponseBase,
} from "@porchlight/core";

import { uploadViewOf } from "@/lib/upload-view";
import { refuse } from "./tool-result";

// The upload tools' answers (SPEC.md §6, §7, §17, #31). The bytes never pass through
// the model: the agent's own client sends them to the signed URL with the curl line.

export interface UploadStatusView {
  readonly mediaId: string;
  readonly filename: string;
  readonly status: "ready" | "held for review" | "not published";
  // The public copy's address, to put in a draft's markdown. Null until it exists.
  readonly url: string | null;
  readonly markdown: string | null;
}

// Where an upload stands, in the agent's terms. Never the quarantine original's
// address: only the published copy is for a post.
export function uploadStatusOf(asset: MediaAsset): UploadStatusView {
  const view = uploadViewOf(asset);
  const status =
    view.publicUrl !== null
      ? "ready"
      : view.awaitingReview
        ? "held for review"
        : "not published";
  return {
    mediaId: view.mediaId,
    filename: view.originalFilename,
    status,
    url: view.publicUrl,
    markdown: view.publicUrl === null ? null : markdownFor(asset, view.publicUrl),
  };
}

function markdownFor(asset: MediaAsset, url: string): string {
  const label = asset.originalFilename.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
  return asset.kind === "image"
    ? `![${label}](${url})`
    : `[${asset.originalFilename}](${url})`;
}

// The shell line that puts the file at the signed URL, with the headers Storage wants.
// The anon key is public by design; the URL itself carries the one-upload token.
export function curlLineFor(uploadUrl: string, anonKey: string): string {
  return [
    "curl -X PUT -T <path-to-file>",
    `-H "apikey: ${anonKey}"`,
    `-H "authorization: Bearer ${anonKey}"`,
    '-H "content-type: <the file\'s MIME type>"',
    '-H "x-upsert: false"',
    `"${uploadUrl}"`,
  ].join(" ");
}

// Every refusal the upload tools can give. A locked verdict says "Refused." and nothing
// more (SPEC.md §7, #31): no reason, no detail, never a URL. The other refusals name
// what the agent can fix, so "Refused." alone is the scan's answer.
export function mediaRefusalFor(response: ResponseBase, what: string) {
  if (response instanceof MediaRefusedResponse) {
    return refuse("Refused.");
  }
  if (response instanceof MediaForbiddenResponse) {
    return refuse(
      response.reason === "agents-closed"
        ? "This site has turned agents off, or off for your account. Ask the site's admin."
        : "Not allowed. Uploading needs the media:upload scope. Ask your member.",
    );
  }
  if (response instanceof MediaRejectedResponse) {
    return refuse(
      "That file type is not allowed here, or the file is not what its name says. Tell your member.",
    );
  }
  if (response instanceof MediaQuotaExceededResponse) {
    return refuse(
      response.reason === "file-too-large"
        ? `The file is over the ${String(response.limit)}-byte limit for one file.`
        : `Your member's uploads are over their ${String(response.limit)}-byte total. Tell them.`,
    );
  }
  if (response instanceof NoSuchMediaResponse) {
    return refuse("No such upload, or it is not yours.");
  }
  console.error(`mcp ${what} failed [${response.correlationId}]`, response);
  return refuse("Porchlight could not do that right now. Tell your member and stop.");
}

// `get_media`'s refusals. A locked upload is refused by the permission rule, and the
// answer must be the same one a missing id gets: anything else would tell the agent,
// every time it asked, that this id was locked.
export function mediaLookupRefusalFor(response: ResponseBase) {
  if (
    response instanceof NoSuchMediaResponse ||
    (response instanceof MediaForbiddenResponse && response.reason === "not-allowed")
  ) {
    return refuse("No such upload, or it is not yours.");
  }
  return mediaRefusalFor(response, "get_media");
}
