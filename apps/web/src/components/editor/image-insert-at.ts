import type { Selection } from "@tiptap/pm/state";

// Where an upload's image goes: at the end of the selection, never over it, so an image
// just inserted stays put and the next one goes beside it. An image belongs in a
// paragraph only. In a code block or a heading it goes after the block, so the code
// stays code and the heading stays text.
export function imageInsertAt(selection: Selection): number {
  const { $to } = selection;
  return $to.parent.isTextblock && $to.parent.type.name !== "paragraph"
    ? $to.after()
    : $to.pos;
}
