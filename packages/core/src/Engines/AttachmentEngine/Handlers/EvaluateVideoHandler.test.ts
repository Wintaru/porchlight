import { describe, expect, test } from "vitest";

import type { Mp4Layout, Mp4Movie } from "../../../Utilities/media/mp4Movie";
import { EvaluateVideoRequest } from "../Requests/EvaluateVideoRequest";
import { AttachmentRejectedResponse } from "../Responses/AttachmentRejectedResponse";
import { VideoAcceptedResponse } from "../Responses/VideoAcceptedResponse";
import { EvaluateVideoHandler } from "./EvaluateVideoHandler";

const handler = new EvaluateVideoHandler();

function movie(
  tracks: Mp4Movie["tracks"],
  boxTypes: readonly string[] = ["moov", "trak"],
): Mp4Movie {
  return { tracks, boxTypes: new Set(boxTypes) };
}

const PREPARED_LAYOUT: Mp4Layout = {
  boxes: ["ftyp", "moov", "mdat"],
  mediaEndsFile: true,
};
const AVC = movie([{ handler: "vide", codecs: ["avc1"] }]);

async function verdict(input: Mp4Movie | undefined, layout = PREPARED_LAYOUT) {
  return handler.handle(new EvaluateVideoRequest(input, layout));
}

describe("EvaluateVideoHandler (#21)", () => {
  test("H.264 with AAC, and H.264 alone, are accepted", async () => {
    expect(
      await verdict(
        movie([
          { handler: "vide", codecs: ["avc1"] },
          { handler: "soun", codecs: ["mp4a"] },
        ]),
      ),
    ).toBeInstanceOf(VideoAcceptedResponse);
    expect(await verdict(movie([{ handler: "vide", codecs: ["avc3"] }]))).toBeInstanceOf(
      VideoAcceptedResponse,
    );
  });

  test.each([
    ["no movie box before the media", undefined],
    [
      "HEVC, which Firefox often cannot play",
      movie([{ handler: "vide", codecs: ["hvc1"] }]),
    ],
    ["sound only", movie([{ handler: "soun", codecs: ["mp4a"] }])],
    [
      "a timed metadata track, such as a phone's location track",
      movie([
        { handler: "vide", codecs: ["avc1"] },
        { handler: "meta", codecs: ["mebx"] },
      ]),
    ],
    ["user data", movie([{ handler: "vide", codecs: ["avc1"] }], ["moov", "udta"])],
    ["a meta box", movie([{ handler: "vide", codecs: ["avc1"] }], ["moov", "meta"])],
    ["a uuid box", movie([{ handler: "vide", codecs: ["avc1"] }], ["moov", "uuid"])],
    [
      "a fragmented file",
      movie([{ handler: "vide", codecs: ["avc1"] }], ["moov", "mvex"]),
    ],
    ["a track with no codec", movie([{ handler: "vide", codecs: [] }])],
    ["a track with two codecs", movie([{ handler: "vide", codecs: ["avc1", "hvc1"] }])],
  ])("refuses %s", async (_name, input) => {
    const result = await verdict(input);
    expect(result).toBeInstanceOf(AttachmentRejectedResponse);
    expect(result).toMatchObject({ reason: "video-not-prepared" });
  });

  test("padding may sit around the movie box", async () => {
    expect(
      await verdict(AVC, {
        boxes: ["ftyp", "free", "moov", "skip", "mdat"],
        mediaEndsFile: true,
      }),
    ).toBeInstanceOf(VideoAcceptedResponse);
  });

  test.each([
    ["no layout", undefined],
    [
      "metadata at the top level",
      { boxes: ["ftyp", "uuid", "moov", "mdat"], mediaEndsFile: true },
    ],
    ["bytes after the media", { boxes: ["ftyp", "moov", "mdat"], mediaEndsFile: false }],
    ["no media box", { boxes: ["ftyp", "moov"], mediaEndsFile: false }],
    ["no ftyp first", { boxes: ["free", "moov", "mdat"], mediaEndsFile: true }],
  ])("refuses a file with %s", async (_name, layout) => {
    const result = await handler.handle(new EvaluateVideoRequest(AVC, layout));
    expect(result).toMatchObject({ reason: "video-not-prepared" });
  });
});
