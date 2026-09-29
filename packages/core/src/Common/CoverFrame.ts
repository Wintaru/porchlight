// How the author frames the cover on a feed card: the point of the picture that stays in
// view, from 0 to 1 across and down, and how far the picture is zoomed in. The card box
// has one shape on every screen, so one framing fits all of them.
export interface CoverFrame {
  readonly focusX: number;
  readonly focusY: number;
  readonly zoom: number;
}

// Keep equal to the posts_cover_zoom_range CHECK (mirrors.test.ts).
export const COVER_ZOOM_MAX = 4;

// The centre, not zoomed: a cover nobody has framed.
export const CENTERED_COVER_FRAME: CoverFrame = { focusX: 0.5, focusY: 0.5, zoom: 1 };

export function isCoverFrameInRange(frame: CoverFrame): boolean {
  const inUnit = (value: number) => value >= 0 && value <= 1;
  return (
    inUnit(frame.focusX) &&
    inUnit(frame.focusY) &&
    frame.zoom >= 1 &&
    frame.zoom <= COVER_ZOOM_MAX
  );
}
