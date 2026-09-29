import { CENTERED_COVER_FRAME, type CoverFrame } from "@porchlight/core/client";
import { useCallback, useEffect, useState } from "react";

import { getUpload } from "@/app/write/media-actions";
import type { UploadView } from "@/lib/upload-view";

export type Cover =
  | { readonly kind: "none" }
  | { readonly kind: "loading"; readonly mediaId: string }
  | { readonly kind: "unseen"; readonly mediaId: string }
  | { readonly kind: "set"; readonly upload: UploadView };

export interface CoverState {
  readonly cover: Cover;
  readonly frame: CoverFrame;
  // The id the form sends: empty for no cover.
  readonly mediaId: string;
  readonly choose: (upload: UploadView) => void;
  readonly clear: () => void;
  readonly reframe: (next: (current: CoverFrame) => CoverFrame) => void;
}

// The editor's cover and its framing. Each change calls `onChange`, so autosave sees it.
export function useCover(
  initialMediaId: string | null,
  initialFrame: CoverFrame,
  onChange: () => void,
): CoverState {
  const [cover, setCover] = useState<Cover>(
    initialMediaId === null
      ? { kind: "none" }
      : { kind: "loading", mediaId: initialMediaId },
  );
  const [frame, setFrame] = useState(initialFrame);

  // A saved cover arrives as an id: look it up once for its picture.
  useEffect(() => {
    if (cover.kind !== "loading") {
      return;
    }
    let live = true;
    void getUpload(cover.mediaId).then((lookup) => {
      if (!live) {
        return;
      }
      if (lookup.status === "found") {
        setCover({ kind: "set", upload: lookup.upload });
      } else if (lookup.status === "gone") {
        setCover({ kind: "none" });
        setFrame(CENTERED_COVER_FRAME);
      } else {
        // The cover stays set, unseen: a failed lookup must not clear it on the next save.
        setCover({ kind: "unseen", mediaId: cover.mediaId });
      }
    });
    return () => {
      live = false;
    };
  }, [cover]);

  // A framing belongs to one picture: a new cover starts centred.
  const choose = useCallback(
    (upload: UploadView) => {
      setCover({ kind: "set", upload });
      setFrame(CENTERED_COVER_FRAME);
      onChange();
    },
    [onChange],
  );

  const clear = useCallback(() => {
    setCover({ kind: "none" });
    setFrame(CENTERED_COVER_FRAME);
    onChange();
  }, [onChange]);

  const reframe = useCallback(
    (next: (current: CoverFrame) => CoverFrame) => {
      setFrame(next);
      onChange();
    },
    [onChange],
  );

  const mediaId =
    cover.kind === "set"
      ? cover.upload.mediaId
      : cover.kind === "none"
        ? ""
        : cover.mediaId;

  return { cover, frame, mediaId, choose, clear, reframe };
}
