"use client";

import { useEffect } from "react";

import { EMBED_PLAYER_PREFIXES } from "@porchlight/core/client";

// Swaps a YouTube or Vimeo card for the service's player when the reader presses it
// (#21). The card is rendered markup in a post, a comment or a preview, so one listener
// on the document serves them all. Until the press the page makes no request to the
// service. Without this script the card stays a link to the video's own page.
export function EmbedPlayers() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest<HTMLAnchorElement>("a[data-embed-player]");
      const player = card?.dataset.embedPlayer;
      if (card === null || card === undefined || player === undefined) {
        return;
      }
      if (!EMBED_PLAYER_PREFIXES.some((prefix) => player.startsWith(prefix))) {
        return;
      }
      event.preventDefault();
      const frame = document.createElement("iframe");
      const url = new URL(player);
      url.searchParams.set("autoplay", "1");
      frame.src = url.toString();
      frame.title = card.dataset.embedTitle ?? "Video player";
      frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
      frame.allowFullscreen = true;
      // YouTube refuses to play in a frame that sends no referrer.
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      card.replaceWith(frame);
      frame.focus();
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
