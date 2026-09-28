// Readies a video for upload in the member's own browser (#21). The site never converts
// video on its server, so the browser does it: whatever the phone recorded (an iPhone's
// HEVC .mov, an Android MP4, a WebM) becomes an H.264 MP4 of at most 1080p with AAC
// sound, which every browser plays. The file is always rewritten, even when it already
// plays: the rewrite drops the location and camera data a phone puts in a video, and
// puts the movie description first so a post can start playing before it all arrives.
// The server checks the result and refuses a file that skipped this.
//
// Mediabunny does the work with the browser's own video hardware (WebCodecs). A file
// that is already H.264 at 1080p or less is copied, not re-encoded, so it is quick.

// 1080p in either orientation.
const MAX_LONG_SIDE = 1920;
const MAX_SHORT_SIDE = 1080;
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv"];

export type PreparedVideo =
  | {
      readonly ok: true;
      readonly file: File;
    }
  | { readonly ok: false; readonly error: string };

export function isVideoFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension);
}

// What the converter hands back: the finished MP4's bytes, or why there are none.
type Converted =
  | { readonly ok: true; readonly bytes: ArrayBuffer }
  | { readonly ok: false; readonly error: string };

export async function prepareVideo(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<PreparedVideo> {
  const converted = await convert(file, onProgress);
  if (!converted.ok) {
    return converted;
  }
  // The converter, its output and its working buffer went out of reach when `convert`
  // returned, so the garbage collector may free that buffer before the File copies the
  // finished bytes. Built inside `convert`, the File would be a third full copy of the
  // video in memory, beside the working buffer and the finished bytes (#95).
  const name = `${file.name.replace(/\.[^.]*$/, "") || "video"}.mp4`;
  try {
    return { ok: true, file: new File([converted.bytes], name, { type: "video/mp4" }) };
  } catch (error: unknown) {
    // A browser short of memory may refuse the copy.
    console.warn("converted video did not fit in memory", error);
    return { ok: false, error: "The video could not be converted. Try another file." };
  }
}

async function convert(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<Converted> {
  // Loaded only when someone picks a video: the library is large.
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    QUALITY_MEDIUM,
  } = await import("mediabunny");
  try {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (track === null) {
      return { ok: false, error: "That file has no video in it." };
    }
    const displayWidth = await track.getDisplayWidth();
    const displayHeight = await track.getDisplayHeight();
    const scale = Math.min(
      1,
      MAX_LONG_SIDE / Math.max(displayWidth, displayHeight),
      MAX_SHORT_SIDE / Math.min(displayWidth, displayHeight),
    );
    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: "avc",
        quality: QUALITY_MEDIUM,
        // An even width: H.264 needs one.
        ...(scale < 1 ? { width: 2 * Math.round((displayWidth * scale) / 2) } : {}),
      },
      audio: { codec: "aac" },
      // No title, place, date or camera: an empty set writes none.
      tags: {},
      showWarnings: false,
    });
    const lostSound = conversion.discardedTracks.some(
      ({ track: discarded, reason }) =>
        discarded.type === "audio" &&
        (reason === "undecodable_source_codec" || reason === "no_encodable_target_codec"),
    );
    if (!conversion.isValid || lostSound) {
      return {
        ok: false,
        error: "This browser cannot convert that video. Try Chrome or Safari.",
      };
    }
    conversion.onProgress = onProgress;
    await conversion.execute();
    if (target.buffer === null) {
      return { ok: false, error: "The video could not be converted. Try again." };
    }
    return { ok: true, bytes: target.buffer };
  } catch (error: unknown) {
    console.warn("video conversion failed", error);
    return { ok: false, error: "The video could not be converted. Try another file." };
  }
}
