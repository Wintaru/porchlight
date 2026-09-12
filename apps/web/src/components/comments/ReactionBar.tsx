import type { ReactionTarget } from "@porchlight/core";

import { toggleReaction } from "@/app/[handle]/[slug]/actions";
import { type ItemReactions, REACTION_KINDS } from "@/read-model/reactions";
import styles from "./comments.module.css";
import { REACTION_GLYPHS } from "./reaction-glyphs";

interface ReactionBarProps {
  readonly target: ReactionTarget;
  readonly reactions: ItemReactions;
  readonly canReact: boolean;
  readonly returnTo: string;
}

// The counts on an item (D9). A member gets one button per kind, pressed when it is
// theirs; everyone else sees the kinds that have a count, and nothing when none do.
export function ReactionBar({ target, reactions, canReact, returnTo }: ReactionBarProps) {
  const shown = canReact
    ? REACTION_KINDS
    : REACTION_KINDS.filter((kind) => reactions.counts[kind] > 0);
  if (shown.length === 0) {
    return null;
  }
  return (
    <ul className={styles.reactions} aria-label="Reactions" data-testid="reactions">
      {shown.map((kind) => {
        const { glyph, label } = REACTION_GLYPHS[kind];
        const count = reactions.counts[kind];
        const content = (
          <>
            <span aria-hidden="true">{glyph}</span>
            <span data-testid={`reaction-count-${kind}`}>{count}</span>
          </>
        );
        return (
          <li key={kind}>
            {canReact ? (
              <form action={toggleReaction}>
                <input type="hidden" name="targetKind" value={target.kind} />
                <input type="hidden" name="targetId" value={target.id} />
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className={styles.reaction}
                  aria-label={label}
                  aria-pressed={reactions.mine.has(kind)}
                >
                  {content}
                </button>
              </form>
            ) : (
              <span className={styles.reaction} aria-label={label}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
