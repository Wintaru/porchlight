// Only this file names the brand, so no object literal outside it can pass for a link.
declare const issuedByStorage: unique symbol;

// A short-lived link to read one stored object, from OpenStorageReadRequest (#95, D4b).
// A video check signs one and uses it for every range read and the streamed hash, where
// each read used to sign its own. Opaque to its callers: a Manager can hand a read only
// a link this accessor issued, never a URL of its own. The scanners' link is a separate
// CreateSignedDownloadUrlRequest, so the link an outside service sees is never this one.
export interface StorageReadLink {
  readonly [issuedByStorage]: true;
  readonly bucket: string;
  readonly path: string;
  readonly url: string;
}

// For this accessor's handlers only. eslint.config.js refuses the import anywhere else.
export function issueStorageReadLink(
  bucket: string,
  path: string,
  url: string,
): StorageReadLink {
  // The one assertion that makes a link: the brand has no runtime value to set.
  return { bucket, path, url } as StorageReadLink;
}
