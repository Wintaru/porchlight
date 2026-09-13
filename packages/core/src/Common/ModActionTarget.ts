import type { ModerationTarget } from "./ModerationTarget";

// What a mod_actions row points at (SPEC.md §7). Extends ModerationTarget's post/comment
// with the other three targets the action list needs: a profile (suspend, ban,
// mark_trusted), an anonymous author (block_anonymous), and media (approve_mature). A
// few actions have no target of their own.
export type ModActionTarget =
  | ModerationTarget
  | { readonly kind: "profile"; readonly id: string }
  | { readonly kind: "anonymousAuthor"; readonly id: string }
  | { readonly kind: "media"; readonly id: string }
  | { readonly kind: "none" };
