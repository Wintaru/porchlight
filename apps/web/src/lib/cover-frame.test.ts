import { CENTERED_COVER_FRAME, COVER_ZOOM_MAX } from "@porchlight/core/client";
import { describe, expect, test } from "vitest";

import { coverFrameVars, framedRect, pannedFrame, zoomedFrame } from "./cover-frame";

const BOX = { width: 160, height: 100 };
const WIDE = { width: 400, height: 100 };

describe("framedRect", () => {
  test("a centred, unzoomed picture fills the box and hides its sides equally", () => {
    expect(framedRect(CENTERED_COVER_FRAME, BOX, WIDE)).toEqual({
      left: -120,
      top: 0,
      width: 400,
      height: 100,
    });
  });

  // The rule `object-position: p` then `scale(z)` around p gives: left = p * (box - drawn).
  test("the focus point lines up with the same point of the box, zoomed or not", () => {
    const frame = { focusX: 0.25, focusY: 0.75, zoom: 2 };
    const rect = framedRect(frame, BOX, WIDE);
    expect(rect.width).toBe(800);
    expect(rect.height).toBe(200);
    expect(rect.left + frame.focusX * rect.width).toBeCloseTo(frame.focusX * BOX.width);
    expect(rect.top + frame.focusY * rect.height).toBeCloseTo(frame.focusY * BOX.height);
  });
});

describe("pannedFrame", () => {
  test("the picture follows the pointer and stops at its edges", () => {
    const left = pannedFrame(CENTERED_COVER_FRAME, BOX, WIDE, 60, 0);
    expect(framedRect(left, BOX, WIDE).left).toBeCloseTo(-60);
    expect(pannedFrame(CENTERED_COVER_FRAME, BOX, WIDE, 1000, 0).focusX).toBe(0);
    expect(pannedFrame(CENTERED_COVER_FRAME, BOX, WIDE, -1000, 0).focusX).toBe(1);
  });

  test("a side with nothing hidden does not move", () => {
    expect(pannedFrame(CENTERED_COVER_FRAME, BOX, WIDE, 0, 40).focusY).toBe(0.5);
  });
});

describe("zoomedFrame", () => {
  test("keeps the zoom between 1 and the most the schema allows", () => {
    expect(zoomedFrame(CENTERED_COVER_FRAME, 0.2).zoom).toBe(1);
    expect(zoomedFrame(CENTERED_COVER_FRAME, 99).zoom).toBe(COVER_ZOOM_MAX);
    expect(zoomedFrame(CENTERED_COVER_FRAME, 1.5)).toMatchObject({
      focusX: 0.5,
      zoom: 1.5,
    });
  });
});

test("coverFrameVars names the focus in percent and the zoom as a factor", () => {
  expect(coverFrameVars({ focusX: 0.125, focusY: 1, zoom: 1.75 })).toEqual({
    "--cover-focus": "12.5% 100%",
    "--cover-zoom": "1.75",
  });
});
