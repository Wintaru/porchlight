import type { IMediaStorageAccessor } from "../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { CreateSignedDownloadUrlRequest } from "../../Accessors/MediaStorageAccessor/Requests/CreateSignedDownloadUrlRequest";
import { DigestStorageObjectRequest } from "../../Accessors/MediaStorageAccessor/Requests/DigestStorageObjectRequest";
import { DownloadStorageObjectRangeRequest } from "../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRangeRequest";
import { LoadStorageObjectInfoRequest } from "../../Accessors/MediaStorageAccessor/Requests/LoadStorageObjectInfoRequest";
import { OpenStorageReadRequest } from "../../Accessors/MediaStorageAccessor/Requests/OpenStorageReadRequest";
import { SignedDownloadUrlCreatedResponse } from "../../Accessors/MediaStorageAccessor/Responses/SignedDownloadUrlCreatedResponse";
import { StorageObjectDigestResponse } from "../../Accessors/MediaStorageAccessor/Responses/StorageObjectDigestResponse";
import { StorageObjectDownloadedResponse } from "../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import { StorageObjectInfoResponse } from "../../Accessors/MediaStorageAccessor/Responses/StorageObjectInfoResponse";
import { StorageReadOpenedResponse } from "../../Accessors/MediaStorageAccessor/Responses/StorageReadOpenedResponse";
import type { StorageReadLink } from "../../Accessors/MediaStorageAccessor/StorageReadLink";
import type { IAttachmentEngine } from "../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { EvaluateVideoRequest } from "../../Engines/AttachmentEngine/Requests/EvaluateVideoRequest";
import { AttachmentClassifiedResponse } from "../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import { VideoAcceptedResponse } from "../../Engines/AttachmentEngine/Responses/VideoAcceptedResponse";
import {
  locateMovieBox,
  type Mp4Layout,
  type Mp4Movie,
  readMovie,
  readTopLevelBox,
} from "../../Utilities/media/mp4Movie";
import { MediaRejectedResponse } from "./Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";
import { unavailable } from "./unavailable";

// A video is read in parts, never whole (#21): it can be hundreds of megabytes, more
// than a request should hold. The file's first bytes prove its type and locate its
// movie box; the movie box says what the tracks are; a streamed hash covers the rest.
// Every one of those reads goes through one signed link (#95); the scanners get a second,
// separate link (C21), so the one an outside service holds is used for nothing else.

// Enough for the `ftyp` box and the start of the movie box that follows it.
const HEAD_BYTES = 64 * 1024;
const BOX_HEADER_BYTES = 8;
// A box header with a 64-bit size.
const LARGE_BOX_HEADER_BYTES = 16;
// A prepared file has one box after the movie box: the media. A few padding boxes are
// allowed; past this many, the file is not one the editor wrote.
const MAX_BOXES_AFTER_MOVIE = 4;
// A movie box for a capped video is well under this; a larger one is refused rather
// than read.
const MAX_MOVIE_BYTES = 16 * 1024 * 1024;
// The type the editor uploads a video with. The public copy keeps the stored type, so
// no other is allowed through.
const VIDEO_CONTENT_TYPE = "video/mp4";

export interface InspectedVideo {
  readonly classified: AttachmentClassifiedResponse;
  readonly bytes: number;
  // The link the inspection read through, for the hash to read through too.
  readonly link: StorageReadLink;
}

export interface SealedVideo {
  readonly sha256: string;
  // A short-lived link the scanners fetch the video from.
  readonly scanUrl: string;
}

interface Where {
  readonly storage: IMediaStorageAccessor;
  readonly attachments: IAttachmentEngine;
  readonly bucket: string;
  readonly path: string;
}

// The checks that need no more than the header and the movie box. A rejection comes
// back as MediaRejectedResponse; the caller removes the object.
export async function inspectVideoUpload(
  where: Where,
  originalFilename: string,
  allowlist: readonly string[],
  context: { readonly correlationId: string },
): Promise<InspectedVideo | MediaRejectedResponse | MediaUnavailableResponse> {
  const { storage, attachments, bucket, path } = where;
  const { correlationId } = context;

  const info = await storage.load(
    new LoadStorageObjectInfoRequest(bucket, path, context),
  );
  if (!(info instanceof StorageObjectInfoResponse)) {
    return unavailable(correlationId, info, "storage.load");
  }
  // Too short to hold even one box header: nothing an MP4 could be.
  if (info.bytes < BOX_HEADER_BYTES) {
    return new MediaRejectedResponse(correlationId, "type-mismatch");
  }
  const opened = await storage.load(new OpenStorageReadRequest(bucket, path, context));
  if (!(opened instanceof StorageReadOpenedResponse)) {
    return unavailable(correlationId, opened, "storage.load");
  }
  const { link } = opened;
  const head = await storage.load(
    new DownloadStorageObjectRangeRequest(
      link,
      0,
      Math.min(HEAD_BYTES, info.bytes),
      context,
    ),
  );
  if (!(head instanceof StorageObjectDownloadedResponse)) {
    return unavailable(correlationId, head, "storage.load");
  }

  const classified = await attachments.evaluate(
    new ClassifyAttachmentRequest(originalFilename, head.bytes, allowlist, context),
  );
  if (classified instanceof AttachmentRejectedResponse) {
    return new MediaRejectedResponse(correlationId, classified.reason);
  }
  if (!(classified instanceof AttachmentClassifiedResponse)) {
    return unavailable(correlationId, classified, "attachments.evaluate");
  }
  if (info.contentType !== VIDEO_CONTENT_TYPE) {
    return new MediaRejectedResponse(correlationId, "type-mismatch");
  }

  const read = async (
    offset: number,
    length: number,
  ): Promise<Uint8Array | MediaUnavailableResponse> => {
    if (offset + length <= head.bytes.length) {
      return head.bytes.slice(offset, offset + length);
    }
    const range = await storage.load(
      new DownloadStorageObjectRangeRequest(link, offset, length, context),
    );
    return range instanceof StorageObjectDownloadedResponse
      ? range.bytes
      : unavailable(correlationId, range, "storage.load");
  };
  const located = locateMovieBox(head.bytes, info.bytes);
  let movie: Mp4Movie | undefined;
  let layout: Mp4Layout | undefined;
  if (located !== undefined && located.movie.size <= MAX_MOVIE_BYTES) {
    const { offset, size } = located.movie;
    const movieBytes = await read(offset, size);
    if (!(movieBytes instanceof Uint8Array)) {
      return movieBytes;
    }
    movie = readMovie(movieBytes);
    const after = await boxesAfterMovie(read, offset + size, info.bytes);
    if (after instanceof MediaUnavailableResponse) {
      return after;
    }
    layout =
      after === undefined
        ? undefined
        : {
            boxes: [...located.before, "moov", ...after.boxes],
            mediaEndsFile: after.mediaEndsFile,
          };
  }
  const evaluated = await attachments.evaluate(
    new EvaluateVideoRequest(movie, layout, context),
  );
  if (evaluated instanceof AttachmentRejectedResponse) {
    return new MediaRejectedResponse(correlationId, evaluated.reason);
  }
  if (!(evaluated instanceof VideoAcceptedResponse)) {
    return unavailable(correlationId, evaluated, "attachments.evaluate");
  }
  return { classified, bytes: info.bytes, link };
}

// The hash of the whole file, and a link for the scanners. `bytes` and `link` are what
// the inspection saw and read through: a file that changed since is not the file that
// was checked.
export async function sealVideoUpload(
  storage: IMediaStorageAccessor,
  inspected: Pick<InspectedVideo, "bytes" | "link">,
  context: { readonly correlationId: string },
): Promise<SealedVideo | MediaUnavailableResponse> {
  const { bytes, link } = inspected;
  const { bucket, path } = link;
  const { correlationId } = context;
  const digest = await storage.load(new DigestStorageObjectRequest(link, context));
  if (!(digest instanceof StorageObjectDigestResponse)) {
    return unavailable(correlationId, digest, "storage.load");
  }
  if (digest.bytes !== bytes) {
    return new MediaUnavailableResponse(
      correlationId,
      `${bucket}/${path} changed size while it was checked`,
    );
  }
  const signed = await storage.load(
    new CreateSignedDownloadUrlRequest(bucket, path, false, context),
  );
  if (!(signed instanceof SignedDownloadUrlCreatedResponse)) {
    return unavailable(correlationId, signed, "storage.load");
  }
  return { sha256: digest.sha256, scanUrl: signed.signedUrl };
}

// The top-level boxes after the movie box, read one header at a time, up to and
// including the media box. Undefined when a header does not parse.
async function boxesAfterMovie(
  read: (
    offset: number,
    length: number,
  ) => Promise<Uint8Array | MediaUnavailableResponse>,
  start: number,
  fileBytes: number,
): Promise<Mp4Layout | undefined | MediaUnavailableResponse> {
  const boxes: string[] = [];
  let offset = start;
  for (let count = 0; count < MAX_BOXES_AFTER_MOVIE && offset < fileBytes; count += 1) {
    const header = await read(
      offset,
      Math.min(LARGE_BOX_HEADER_BYTES, fileBytes - offset),
    );
    if (!(header instanceof Uint8Array)) {
      return header;
    }
    const box = readTopLevelBox(header, offset, fileBytes);
    if (box === undefined) {
      return undefined;
    }
    boxes.push(box.type);
    if (box.type === "mdat") {
      return { boxes, mediaEndsFile: box.offset + box.size === fileBytes };
    }
    offset += box.size;
  }
  return { boxes, mediaEndsFile: false };
}
