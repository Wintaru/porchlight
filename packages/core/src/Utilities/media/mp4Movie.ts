// Reading an MP4's structure without its media (#21). An MP4 is a list of boxes: each
// starts with a 4-byte size and a 4-character type, and some boxes hold more boxes.
// The `moov` box describes the tracks; `mdat` holds the frames. Pure and stateless:
// these functions report what the bytes hold, and the caller decides what to allow.

export interface Mp4BoxHeader {
  readonly type: string;
  readonly offset: number;
  readonly size: number;
  readonly headerSize: number;
}

export interface Mp4Track {
  // The `hdlr` type: "vide" for video, "soun" for sound, others for timed metadata.
  readonly handler: string;
  // The `stsd` sample entry types: the codec, "avc1" for H.264, "mp4a" for AAC.
  readonly codecs: readonly string[];
}

export interface Mp4Movie {
  readonly tracks: readonly Mp4Track[];
  // Every box type found anywhere in the movie box, for a check such as "no `udta`".
  readonly boxTypes: ReadonlySet<string>;
}

// The file's top-level boxes in order, as far as the media box, and whether the media
// box runs to the file's end. Anything after it would be bytes nothing checked.
export interface Mp4Layout {
  readonly boxes: readonly string[];
  readonly mediaEndsFile: boolean;
}

// Boxes whose content is more boxes. `meta` is a full box: 4 bytes of version and flags
// come before its children.
const CONTAINERS = new Set([
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
  "edts",
  "dinf",
  "udta",
  "mvex",
  "tref",
]);
const FULL_BOX_CONTAINERS = new Set(["meta"]);
const HEADER = 8;
const LARGE_HEADER = 16;
// Deeper than any real movie box. A crafted one nested far deeper would exhaust the
// stack; it is refused instead.
const MAX_DEPTH = 16;

// One box header at `offset`, or undefined when the bytes end first or the size cannot
// be right. `end` is where the enclosing box (or the file) ends.
export function readBoxHeader(
  bytes: Uint8Array,
  offset: number,
  end: number,
): Mp4BoxHeader | undefined {
  if (offset + HEADER > bytes.length) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
  const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
  let size = view.getUint32(0);
  let headerSize = HEADER;
  if (size === 1) {
    if (offset + LARGE_HEADER > bytes.length) {
      return undefined;
    }
    size = Number(view.getBigUint64(8));
    headerSize = LARGE_HEADER;
  } else if (size === 0) {
    size = end - offset;
  }
  if (size < headerSize || offset + size > end) {
    return undefined;
  }
  return { type, offset, size, headerSize };
}

// A top-level box header read from `header`, a few bytes that start at `offset` in a
// file of `fileBytes`. For a box after the movie box, read on its own.
export function readTopLevelBox(
  header: Uint8Array,
  offset: number,
  fileBytes: number,
): Mp4BoxHeader | undefined {
  const box = readBoxHeader(header, 0, fileBytes - offset);
  return box === undefined ? undefined : { ...box, offset };
}

// The movie box and the top-level boxes before it, from the first bytes of the file.
// Undefined when the media or the end of `head` comes first: the movie box must come
// before the media, so a browser can start to play before the whole file arrives and
// the check never reads the media itself.
export function locateMovieBox(
  head: Uint8Array,
  fileBytes: number,
): { readonly movie: Mp4BoxHeader; readonly before: readonly string[] } | undefined {
  const before: string[] = [];
  let offset = 0;
  while (offset < fileBytes) {
    const box = readBoxHeader(head, offset, fileBytes);
    if (box === undefined || box.type === "mdat") {
      return undefined;
    }
    if (box.type === "moov") {
      return { movie: box, before };
    }
    before.push(box.type);
    offset += box.size;
  }
  return undefined;
}

// The tracks and box types of a whole movie box. Undefined when a box inside it does
// not fit its parent.
export function readMovie(moov: Uint8Array): Mp4Movie | undefined {
  const boxTypes = new Set<string>();
  const tracks: Mp4Track[] = [];
  const top = readBoxHeader(moov, 0, moov.length);
  if (top?.type !== "moov") {
    return undefined;
  }
  boxTypes.add(top.type);
  const walked = walk(moov, top.headerSize, top.size, 1, boxTypes, (trak) => {
    const track = readTrack(moov, trak);
    if (track !== undefined) {
      tracks.push(track);
    }
    return track !== undefined;
  });
  return walked ? { tracks, boxTypes } : undefined;
}

function walk(
  bytes: Uint8Array,
  start: number,
  end: number,
  depth: number,
  boxTypes: Set<string>,
  onTrack: (trak: Mp4BoxHeader) => boolean,
): boolean {
  if (depth > MAX_DEPTH) {
    return false;
  }
  let offset = start;
  while (offset < end) {
    const box = readBoxHeader(bytes, offset, end);
    if (box === undefined) {
      return false;
    }
    boxTypes.add(box.type);
    if (box.type === "trak" && !onTrack(box)) {
      return false;
    }
    const childStart = CONTAINERS.has(box.type)
      ? box.offset + box.headerSize
      : FULL_BOX_CONTAINERS.has(box.type)
        ? box.offset + box.headerSize + 4
        : undefined;
    if (
      childStart !== undefined &&
      !walk(bytes, childStart, box.offset + box.size, depth + 1, boxTypes, onTrack)
    ) {
      return false;
    }
    offset += box.size;
  }
  return true;
}

// A track's handler (`mdia/hdlr`) and sample entry types (`mdia/minf/stbl/stsd`).
function readTrack(bytes: Uint8Array, trak: Mp4BoxHeader): Mp4Track | undefined {
  const mdia = child(bytes, trak, "mdia");
  const hdlr = mdia === undefined ? undefined : child(bytes, mdia, "hdlr");
  const stbl = pathOf(bytes, mdia, ["minf", "stbl"]);
  const stsd = stbl === undefined ? undefined : child(bytes, stbl, "stsd");
  if (hdlr === undefined || stsd === undefined) {
    return undefined;
  }
  // hdlr: version and flags (4), pre_defined (4), then the handler type.
  const handlerAt = hdlr.offset + hdlr.headerSize + 8;
  if (handlerAt + 4 > hdlr.offset + hdlr.size) {
    return undefined;
  }
  const handler = String.fromCharCode(...bytes.slice(handlerAt, handlerAt + 4));
  // stsd: version and flags (4), entry count (4), then one box per sample entry.
  const entriesAt = stsd.offset + stsd.headerSize + 8;
  const codecs: string[] = [];
  let offset = entriesAt;
  while (offset < stsd.offset + stsd.size) {
    const entry = readBoxHeader(bytes, offset, stsd.offset + stsd.size);
    if (entry === undefined) {
      return undefined;
    }
    codecs.push(entry.type);
    offset += entry.size;
  }
  return { handler, codecs };
}

function pathOf(
  bytes: Uint8Array,
  from: Mp4BoxHeader | undefined,
  types: readonly string[],
): Mp4BoxHeader | undefined {
  let box = from;
  for (const type of types) {
    box = box === undefined ? undefined : child(bytes, box, type);
  }
  return box;
}

function child(
  bytes: Uint8Array,
  parent: Mp4BoxHeader,
  type: string,
): Mp4BoxHeader | undefined {
  const end = parent.offset + parent.size;
  let offset = parent.offset + parent.headerSize;
  while (offset < end) {
    const box = readBoxHeader(bytes, offset, end);
    if (box === undefined) {
      return undefined;
    }
    if (box.type === type) {
      return box;
    }
    offset += box.size;
  }
  return undefined;
}
