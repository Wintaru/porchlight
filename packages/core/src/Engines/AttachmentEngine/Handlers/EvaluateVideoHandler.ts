import type { IHandler } from "../../../Common/IHandler";
import type { Mp4Layout } from "../../../Utilities/media/mp4Movie";
import type { EvaluateVideoRequest } from "../Requests/EvaluateVideoRequest";
import { AttachmentRejectedResponse } from "../Responses/AttachmentRejectedResponse";
import { VideoAcceptedResponse } from "../Responses/VideoAcceptedResponse";

type Result = VideoAcceptedResponse | AttachmentRejectedResponse;

// The video the site serves as it is (#21, SPEC.md §6): the site never converts a video
// itself, so it accepts only what every browser plays and what carries nothing about
// the uploader. That is H.264 video, AAC sound or none, one codec per track, and no box
// that holds metadata: `udta` and `meta` carry a phone's location and camera, `uuid`
// can carry XMP. A track of any other kind (a phone's timed location track) is refused
// too. Around the movie box only padding may sit, and the media box must end the file,
// so no metadata hides at the top level or after the media; a fragmented file (`mvex`)
// is refused for the same reason. The frames themselves are not read. The editor's own
// conversion writes exactly this; a file from anywhere else must match it.
const VIDEO_CODECS: readonly string[] = ["avc1", "avc3"];
const SOUND_CODECS: readonly string[] = ["mp4a"];
const METADATA_BOXES: readonly string[] = ["udta", "meta", "uuid", "mvex"];
const PADDING_BOXES: readonly string[] = ["free", "skip"];

// ftyp, padding, moov, padding, mdat: the shape a prepared file has.
function isPreparedLayout(layout: Mp4Layout): boolean {
  const [first, ...rest] = layout.boxes;
  const movieAt = rest.indexOf("moov");
  const last = rest.at(-1);
  const between = [...rest.slice(0, movieAt), ...rest.slice(movieAt + 1, -1)];
  return (
    first === "ftyp" &&
    movieAt !== -1 &&
    last === "mdat" &&
    movieAt < rest.length - 1 &&
    between.every((type) => PADDING_BOXES.includes(type)) &&
    layout.mediaEndsFile
  );
}

export class EvaluateVideoHandler implements IHandler<EvaluateVideoRequest, Result> {
  handle(request: EvaluateVideoRequest): Promise<Result> {
    const { correlationId, movie, layout } = request;
    const refused = new AttachmentRejectedResponse(correlationId, "video-not-prepared");
    if (movie === undefined || layout === undefined || !isPreparedLayout(layout)) {
      return Promise.resolve(refused);
    }
    if (METADATA_BOXES.some((type) => movie.boxTypes.has(type))) {
      return Promise.resolve(refused);
    }
    const playable = movie.tracks.every(({ handler, codecs }) => {
      const [codec, ...others] = codecs;
      if (codec === undefined || others.length > 0) {
        return false;
      }
      return (
        (handler === "vide" && VIDEO_CODECS.includes(codec)) ||
        (handler === "soun" && SOUND_CODECS.includes(codec))
      );
    });
    const hasVideo = movie.tracks.some((track) => track.handler === "vide");
    return Promise.resolve(
      playable && hasVideo ? new VideoAcceptedResponse(correlationId) : refused,
    );
  }
}
