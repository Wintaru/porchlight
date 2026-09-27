import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { locateMovieBox, readMovie, readTopLevelBox } from "./mp4Movie";

function fixture(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(join(import.meta.dirname, "../../../test/fixtures/media", name)),
  );
}

// prepared.mp4 is what the editor's conversion writes; unprepared.mp4 is an encoder's
// own output with a location and a title, its movie box after the media (#21).
describe("mp4Movie", () => {
  test("finds a movie box that comes before the media, and reads its tracks", () => {
    const file = fixture("prepared.mp4");
    const located = locateMovieBox(file.slice(0, 64 * 1024), file.length);
    if (located === undefined) {
      throw new Error("no movie box found");
    }
    const box = located.movie;
    expect(located.before).toEqual(["ftyp"]);
    const movie = readMovie(file.slice(box.offset, box.offset + box.size));
    expect(movie?.tracks).toEqual([
      { handler: "vide", codecs: ["avc1"] },
      { handler: "soun", codecs: ["mp4a"] },
    ]);
    expect(movie?.boxTypes.has("udta")).toBe(false);

    // The media box follows and runs to the end of the file.
    const after = box.offset + box.size;
    const media = readTopLevelBox(file.slice(after, after + 16), after, file.length);
    expect(media).toMatchObject({ type: "mdat", offset: after });
    expect((media?.offset ?? 0) + (media?.size ?? 0)).toBe(file.length);
  });

  test("a movie box nested past any real depth is refused, not a crash", () => {
    const depth = 200_000;
    const bytes = new Uint8Array(8 * depth);
    const view = new DataView(bytes.buffer);
    for (let level = 0; level < depth; level += 1) {
      view.setUint32(8 * level, 8 * (depth - level));
      bytes.set(new TextEncoder().encode(level === 0 ? "moov" : "edts"), 8 * level + 4);
    }
    expect(readMovie(bytes)).toBeUndefined();
  });

  test("a movie box after the media is not located", () => {
    const file = fixture("unprepared.mp4");
    expect(locateMovieBox(file.slice(0, 64 * 1024), file.length)).toBeUndefined();
  });

  test("the metadata boxes of an unprepared file show in its box types", () => {
    const file = fixture("unprepared.mp4");
    const at = file.length - 1;
    // The movie box is the last top-level box: walk the boxes to it.
    let offset = 0;
    let movie;
    while (offset < at) {
      const size = new DataView(file.buffer, file.byteOffset + offset).getUint32(0);
      const type = String.fromCharCode(...file.slice(offset + 4, offset + 8));
      if (type === "moov") {
        movie = readMovie(file.slice(offset, offset + size));
      }
      offset += size;
    }
    expect(movie?.boxTypes.has("udta")).toBe(true);
  });

  test("a file that does not start with ftyp, or a box larger than its file, is refused", () => {
    const file = fixture("prepared.mp4");
    expect(locateMovieBox(file.slice(8), file.length - 8)).toBeUndefined();
    expect(locateMovieBox(file.slice(0, 64 * 1024), 100)).toBeUndefined();
    expect(
      readMovie(new Uint8Array([0, 0, 0, 64, 0x6d, 0x6f, 0x6f, 0x76])),
    ).toBeUndefined();
  });
});
