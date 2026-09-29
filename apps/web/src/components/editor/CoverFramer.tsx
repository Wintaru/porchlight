"use client";

import { COVER_ZOOM_MAX, type CoverFrame } from "@porchlight/core/client";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { framedRect, pannedFrame, type Size, zoomedFrame } from "@/lib/cover-frame";
import styles from "./editor.module.css";

interface CoverFramerProps {
  readonly src: string;
  readonly mature: boolean;
  readonly frame: CoverFrame;
  readonly onReframe: (next: (current: CoverFrame) => CoverFrame) => void;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const KEY_STEP_PX = 10;
const KEY_STEP_LARGE_PX = 40;
const ZOOM_STEP = 0.1;

// The cover in the feed card's box, with the rest of the picture shaded around it. Drag
// or use the arrow keys to move the picture; the slider, pinch or +/- zoom it. The box
// has the card's shape on every screen, so what shows in it is what the card shows.
export function CoverFramer({ src, mature, frame, onReframe }: CoverFramerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size | null>(null);
  const [picture, setPicture] = useState<Size | null>(null);
  const [revealed, setRevealed] = useState(false);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ readonly distance: number; readonly zoom: number } | null>(null);
  const hintId = useId();

  useEffect(() => {
    const element = boxRef.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        const { width, height } = entry.contentRect;
        setBox({ width, height });
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const pan = (dx: number, dy: number) => {
    if (box === null || picture === null) {
      return;
    }
    onReframe((current) => pannedFrame(current, box, picture, dx, dy));
  };

  const zoomTo = (zoom: number) => {
    onReframe((current) => zoomedFrame(current, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { distance: spread(pointers.current), zoom: frame.zoom };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (previous === undefined) {
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = pinch.current;
    if (start !== null && start.distance > 0) {
      zoomTo((start.zoom * spread(pointers.current)) / start.distance);
      return;
    }
    if (pointers.current.size === 1) {
      pan(event.clientX - previous.x, event.clientY - previous.y);
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE_PX : KEY_STEP_PX;
    const moves: Readonly<Record<string, Point>> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (move !== undefined) {
      pan(move.x, move.y);
    } else if (event.key === "+" || event.key === "=") {
      zoomTo(frame.zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      zoomTo(frame.zoom - ZOOM_STEP);
    } else {
      return;
    }
    event.preventDefault();
  };

  const rect = box === null || picture === null ? null : framedRect(frame, box, picture);

  return (
    <div className={styles.framer}>
      <div
        className={styles.framerStage}
        role="group"
        aria-label="Cover framing"
        aria-describedby={hintId}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        data-testid="cover-framer"
      >
        <div ref={boxRef} className={styles.framerBox} data-testid="cover-frame-box">
          {/* eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image */}
          <img
            className={styles.framerImage}
            src={src}
            alt="The cover image"
            draggable={false}
            data-blurred={mature && !revealed}
            style={
              rect === null
                ? undefined
                : {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }
            }
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth === 0 || naturalHeight === 0) {
                return;
              }
              setPicture({ width: naturalWidth, height: naturalHeight });
            }}
            data-testid="cover-image"
          />
          <div className={styles.framerWindow} aria-hidden="true" />
        </div>
      </div>
      <span className={styles.hint} id={hintId}>
        The bright box is what the feed card shows. Drag the picture or use the arrow keys
        to move it.
      </span>
      <label className={styles.framerZoom}>
        <span className={styles.hint}>Zoom</span>
        <input
          type="range"
          min={1}
          max={COVER_ZOOM_MAX}
          step={0.01}
          value={frame.zoom}
          onChange={(event) => {
            zoomTo(Number(event.target.value));
          }}
          data-testid="cover-zoom"
        />
      </label>
      {mature && (
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={revealed}
            onChange={(event) => {
              setRevealed(event.target.checked);
            }}
          />
          Show the mature image while I frame it
        </label>
      )}
    </div>
  );
}

// How far apart the first two pointers are: a pinch zooms by how this changes.
function spread(pointers: ReadonlyMap<number, Point>): number {
  const [first, second] = [...pointers.values()];
  if (first === undefined || second === undefined) {
    return 0;
  }
  return Math.hypot(first.x - second.x, first.y - second.y);
}
