import type { PostDraft } from "./PostDraft";

// The fields a save may change. A missing field is left as it is. The slug never
// changes: links stay alive after a title edit (D11).
export type PostDraftChanges = Partial<PostDraft>;
