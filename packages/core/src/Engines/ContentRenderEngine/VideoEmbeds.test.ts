import { describe, expect, test } from "vitest";

import { EMBED_PLAYER_PREFIXES } from "../../Common/EmbedPlayers";
import { videoEmbedFor } from "./VideoEmbeds";

const PREFIX = "https://storage.example/storage/v1/object/public/public-media/";

function player(href: string): unknown {
  const node = videoEmbedFor(href, PREFIX);
  const link = node?.children?.[0];
  return link?.properties?.dataEmbedPlayer;
}

function videoSource(href: string): unknown {
  const node = videoEmbedFor(href, PREFIX);
  const video = node?.children?.[0];
  return video?.tagName === "video" ? video.properties?.src : undefined;
}

describe("videoEmbedFor (#21)", () => {
  test.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL123"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["http://youtu.be/dQw4w9WgXcQ"],
  ])("plays %s from youtube-nocookie.com", (href) => {
    expect(player(href)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  test("keeps a YouTube start time, in seconds", () => {
    expect(player("https://youtu.be/dQw4w9WgXcQ?t=1m5s")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=65",
    );
    expect(player("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    );
  });

  test("plays a Vimeo video without tracking, and an unlisted one with its hash", () => {
    expect(player("https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
    expect(player("https://vimeo.com/76979871/abc123def4")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1&h=abc123def4",
    );
  });

  test("an Imgur video file plays from i.imgur.com as MP4", () => {
    expect(videoSource("https://i.imgur.com/AbCdE12.gifv")).toBe(
      "https://i.imgur.com/AbCdE12.mp4",
    );
  });

  test("this site's own published video plays; another path on the same bucket does not", () => {
    const own = `${PREFIX}0b6a6a1e-2f9e-4d35-9f37-6c8d3d8a8f3e.mp4`;
    expect(videoSource(own)).toBe(own);
    expect(
      videoEmbedFor(`${PREFIX}0b6a6a1e-2f9e-4d35-9f37-6c8d3d8a8f3e.pdf`, PREFIX),
    ).toBe(undefined);
  });

  test.each([
    ["an id of the wrong shape", "https://youtu.be/short"],
    ["a lookalike host", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"],
    ["a YouTube channel page", "https://www.youtube.com/@porchlight"],
    ["an Imgur page, which may be a picture", "https://imgur.com/AbCdE12"],
    ["an Imgur picture", "https://i.imgur.com/AbCdE12.jpg"],
    ["a Vimeo hash of the wrong shape", "https://vimeo.com/76979871/<script>"],
    [
      "another site's storage",
      "https://other.example/storage/v1/object/public/public-media/0b6a6a1e-2f9e-4d35-9f37-6c8d3d8a8f3e.mp4",
    ],
    ["a mailto link", "mailto:someone@example.com"],
    ["not an address", "porch light"],
  ])("leaves %s as a link", (_name, href) => {
    expect(videoEmbedFor(href, PREFIX)).toBeUndefined();
  });

  test("every card's player address is one the page script will load", () => {
    const addresses = [
      player("https://youtu.be/dQw4w9WgXcQ"),
      player("https://vimeo.com/76979871"),
    ];
    for (const address of addresses) {
      expect(
        EMBED_PLAYER_PREFIXES.some(
          (prefix) => typeof address === "string" && address.startsWith(prefix),
        ),
      ).toBe(true);
    }
  });
});
