import { COVER_ZOOM_MAX, type CoverFrame } from "@porchlight/core/client";
import type { CSSProperties } from "react";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Size {
  readonly left: number;
  readonly top: number;
}

// The framing as the CSS custom properties the feed card reads: the picture fills the
// box (`object-fit: cover`), its focus point sits at the same point of the box
// (`object-position`), and it is scaled up around that point.
export function coverFrameVars(frame: CoverFrame): CSSProperties {
  const vars: Record<`--${string}`, string> = {
    "--cover-focus": `${percent(frame.focusX)} ${percent(frame.focusY)}`,
    "--cover-zoom": String(frame.zoom),
  };
  return vars;
}

// Where the card's CSS draws the picture, relative to the box's top-left corner. The
// editor draws the picture here by hand, so it can also show the parts outside the box.
export function framedRect(frame: CoverFrame, box: Size, picture: Size): Rect {
  const fill = Math.max(box.width / picture.width, box.height / picture.height);
  const width = picture.width * fill * frame.zoom;
  const height = picture.height * fill * frame.zoom;
  return {
    left: frame.focusX * (box.width - width),
    top: frame.focusY * (box.height - height),
    width,
    height,
  };
}

// The framing after the picture moves by (dx, dy) pixels. The picture always covers the
// box: the focus point stops at the picture's edges.
export function pannedFrame(
  frame: CoverFrame,
  box: Size,
  picture: Size,
  dx: number,
  dy: number,
): CoverFrame {
  const rect = framedRect(frame, box, picture);
  return {
    focusX: shifted(frame.focusX, dx, rect.width - box.width),
    focusY: shifted(frame.focusY, dy, rect.height - box.height),
    zoom: frame.zoom,
  };
}

export function zoomedFrame(frame: CoverFrame, zoom: number): CoverFrame {
  return { ...frame, zoom: rounded(Math.min(COVER_ZOOM_MAX, Math.max(1, zoom))) };
}

// A picture that is no wider than the box cannot move sideways: nothing is hidden.
const LEAST_SPARE_PX = 0.5;

function shifted(focus: number, delta: number, spare: number): number {
  if (spare < LEAST_SPARE_PX) {
    return focus;
  }
  return rounded(Math.min(1, Math.max(0, focus - delta / spare)));
}

// Four places are finer than a pixel on any screen, and keep the form's payload stable.
function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function percent(fraction: number): string {
  return `${String(rounded(fraction * 100))}%`;
}
