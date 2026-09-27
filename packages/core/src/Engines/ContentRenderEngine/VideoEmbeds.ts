import { EMBED_PLAYERS } from "../../Common/EmbedPlayers";
import type { HastNode } from "../../Utilities/markdown/renderMarkdown";

// Which video links become players (#21). A YouTube, Vimeo or Imgur video link, or
// this site's own published video, alone on its line (Utilities/markdown/loneLinks.ts).
// Every other link stays a link.
//
// A YouTube or Vimeo link becomes a card that links to the video. Nothing loads from
// that service until the reader presses it: the page's EmbedPlayers script then swaps
// the card for the service's player, from the privacy-minded address each offers
// (youtube-nocookie.com, Vimeo with `dnt=1`). Without the script, the card is still a
// plain link. An Imgur video is a file, so it plays in the browser's own player, which
// fetches nothing until play (`preload="none"`).
//
// Each id is checked against its service's own shape, so no text from the link reaches
// the markup except that id.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,20}$/;
const IMGUR_ID = /^[A-Za-z0-9]{5,10}$/;
const UPLOADED_VIDEO_KEY = /^[0-9a-f-]{36}\.mp4$/;
// YouTube's `t`: seconds ("90", "90s") or "1h2m3s" parts.
const YOUTUBE_TIME = /^(?:(\d{1,2})h)?(?:(\d{1,3})m)?(?:(\d{1,5})s?)?$/;

interface Frame {
  readonly service: "YouTube" | "Vimeo";
  readonly pageUrl: string;
  readonly playerUrl: string;
}

export function videoEmbedFor(
  href: string,
  uploadedVideoPrefix: string | null,
): HastNode | undefined {
  if (uploadedVideoPrefix !== null && href.startsWith(uploadedVideoPrefix)) {
    const key = href.slice(uploadedVideoPrefix.length);
    return UPLOADED_VIDEO_KEY.test(key)
      ? videoFile("upload", href, "metadata")
      : undefined;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return undefined;
  }
  const imgur = imgurVideoOf(url);
  if (imgur !== undefined) {
    return videoFile("imgur", imgur, "none");
  }
  const frame = youtubeFrameOf(url) ?? vimeoFrameOf(url);
  return frame === undefined ? undefined : card(frame);
}

function youtubeFrameOf(url: URL): Frame | undefined {
  const host = url.hostname.replace(/^(www|m)\./, "");
  const segments = url.pathname.split("/").filter((part) => part !== "");
  let id: string | undefined;
  if (host === "youtu.be" && segments.length === 1) {
    id = segments[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments.length === 1 && segments[0] === "watch") {
      id = url.searchParams.get("v") ?? undefined;
    } else if (
      segments.length === 2 &&
      (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live")
    ) {
      id = segments[1];
    }
  }
  if (id === undefined || !YOUTUBE_ID.test(id)) {
    return undefined;
  }
  const start = startSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
  const query = start === undefined ? "" : `?start=${String(start)}`;
  return {
    service: "YouTube",
    pageUrl: `https://www.youtube.com/watch?v=${id}${start === undefined ? "" : `&t=${String(start)}`}`,
    playerUrl: `${EMBED_PLAYERS.youtube}${id}${query}`,
  };
}

function startSeconds(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const match = YOUTUBE_TIME.exec(value);
  if (match === null) {
    return undefined;
  }
  const [, hours, minutes, seconds] = match;
  const total =
    Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
  return total > 0 ? total : undefined;
}

function vimeoFrameOf(url: URL): Frame | undefined {
  const host = url.hostname.replace(/^www\./, "");
  const segments = url.pathname.split("/").filter((part) => part !== "");
  let id: string | undefined;
  let hash: string | undefined;
  if (host === "vimeo.com" && (segments.length === 1 || segments.length === 2)) {
    [id, hash] = segments;
  } else if (
    host === "player.vimeo.com" &&
    segments.length === 2 &&
    segments[0] === "video"
  ) {
    id = segments[1];
    hash = url.searchParams.get("h") ?? undefined;
  }
  if (id === undefined || !VIMEO_ID.test(id)) {
    return undefined;
  }
  if (hash !== undefined && !VIMEO_HASH.test(hash)) {
    return undefined;
  }
  const unlisted = hash === undefined ? "" : `&h=${hash}`;
  return {
    service: "Vimeo",
    pageUrl: `https://vimeo.com/${id}${hash === undefined ? "" : `/${hash}`}`,
    playerUrl: `${EMBED_PLAYERS.vimeo}${id}?dnt=1${unlisted}`,
  };
}

// Only a direct Imgur video file. An Imgur page may hold a picture or an album, which
// the link cannot tell apart, so it stays a link.
function imgurVideoOf(url: URL): string | undefined {
  if (url.hostname !== "i.imgur.com") {
    return undefined;
  }
  const match = /^\/([^/.]+)\.(mp4|gifv|webm)$/.exec(url.pathname);
  const id = match?.[1];
  return id !== undefined && IMGUR_ID.test(id)
    ? `https://i.imgur.com/${id}.mp4`
    : undefined;
}

function card(frame: Frame): HastNode {
  return {
    type: "element",
    tagName: "div",
    properties: { dataEmbed: frame.service.toLowerCase() },
    children: [
      {
        type: "element",
        tagName: "a",
        properties: {
          href: frame.pageUrl,
          dataEmbedPlayer: frame.playerUrl,
          dataEmbedTitle: `${frame.service} video`,
        },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { dataEmbedPlay: "" },
            children: [],
          },
          { type: "text", value: `Play video on ${frame.service}` },
        ],
      },
    ],
  };
}

function videoFile(
  source: "upload" | "imgur",
  src: string,
  preload: "metadata" | "none",
): HastNode {
  return {
    type: "element",
    tagName: "div",
    properties: { dataEmbed: source },
    children: [
      {
        type: "element",
        tagName: "video",
        properties: { src, controls: true, playsInline: true, preload },
        children: [],
      },
    ],
  };
}
