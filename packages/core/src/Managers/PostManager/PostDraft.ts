import type { CoverFrame } from "../../Common/CoverFrame";
import type { PostVisibility } from "../../Common/PostVisibility";

// What the editor sends for a new post (the Editor board). Tags are the names as
// typed; the Manager derives their slugs. Everything else the schema defaults.
export interface PostDraft {
  readonly title: string;
  readonly bodyMd: string;
  readonly summary: string | null;
  readonly tags: readonly string[];
  readonly visibility: PostVisibility;
  readonly commentsEnabled: boolean;
  // The cover image (the Editor board's drop zone, #52): the author's own upload, or
  // null for none. Absent means "no cover" on a new draft and "unchanged" on a save.
  readonly coverMediaId?: string | null;
  // How the cover sits in the feed card's box. Absent means centred on a new draft, and
  // on a save it means unchanged, or centred when the save changes the cover.
  readonly coverFrame?: CoverFrame;
}
