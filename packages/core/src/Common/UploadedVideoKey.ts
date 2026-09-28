// The key of a published video in the public bucket (#21): the upload's id and `.mp4`.
// The publish step writes it and the ContentRenderEngine only turns a link to such a
// key into a player, so both use these two functions.
const VIDEO_KEY_EXTENSION = ".mp4";
const UPLOAD_ID = /^[0-9a-f-]{36}$/;

export function uploadedVideoKeyOf(uploadId: string): string {
  return `${uploadId}${VIDEO_KEY_EXTENSION}`;
}

export function isUploadedVideoKey(key: string): boolean {
  return (
    key.endsWith(VIDEO_KEY_EXTENSION) &&
    UPLOAD_ID.test(key.slice(0, -VIDEO_KEY_EXTENSION.length))
  );
}
