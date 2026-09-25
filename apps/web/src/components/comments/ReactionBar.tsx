import type { ReactionTarget } from "@porchlight/core";

import { toggleReaction } from "@/app/[handle]/[slug]/actions";
import {
  type ItemReactions,
  type ReactionKind,
  REACTION_KINDS,
} from "@/read-model/reactions";
import styles from "./comments.module.css";
import { REACTION_GLYPHS } from "./reaction-glyphs";

interface ReactionBarProps {
  readonly target: ReactionTarget;
  readonly reactions: ItemReactions;
  readonly canReact: boolean;
  readonly returnTo: string;
}

// The counts on an item (D9, the Post board). Everyone sees the kinds that have a
// count; a member's are buttons, pressed when they are theirs, and a dashed + opens the
// kinds nobody has used yet. The + is a <details>, so it opens with no JavaScript.
export function ReactionBar({ target, reactions, canReact, returnTo }: ReactionBarProps) {
  const used = REACTION_KINDS.filter((kind) => reactions.counts[kind] > 0);
  const unused = REACTION_KINDS.filter((kind) => reactions.counts[kind] === 0);
  if (used.length === 0 && !canReact) {
    return null;
  }
  const button = (kind: ReactionKind) => (
    <ReactionButton
      kind={kind}
      count={reactions.counts[kind]}
      pressed={reactions.mine.has(kind)}
      target={target}
      returnTo={returnTo}
    />
  );
  return (
    <ul className={styles.reactions} aria-label="Reactions" data-testid="reactions">
      {used.map((kind) => (
        <li key={kind}>
          {canReact ? (
            button(kind)
          ) : (
            <ReactionCount kind={kind} count={reactions.counts[kind]} />
          )}
        </li>
      ))}
      {canReact && unused.length > 0 && (
        <li>
          {/* Keyed on what it offers: a pick changes that, so React mounts a fresh,
              closed <details> — it does not own `open`, and would leave it open. */}
          <details key={unused.join()} className={styles.addReaction}>
            <summary className={styles.reaction} aria-label="Add a reaction">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <ul className={styles.reactionPicker} data-testid="reaction-picker">
              {unused.map((kind) => (
                <li key={kind}>{button(kind)}</li>
              ))}
            </ul>
          </details>
        </li>
      )}
    </ul>
  );
}

function ReactionContent({ kind, count }: { kind: ReactionKind; count: number }) {
  return (
    <>
      <span aria-hidden="true">{REACTION_GLYPHS[kind].glyph}</span>
      <span data-testid={`reaction-count-${kind}`}>{count}</span>
    </>
  );
}

function ReactionCount({ kind, count }: { kind: ReactionKind; count: number }) {
  return (
    <span className={styles.reaction} aria-label={REACTION_GLYPHS[kind].label}>
      <ReactionContent kind={kind} count={count} />
    </span>
  );
}

interface ReactionButtonProps {
  readonly kind: ReactionKind;
  readonly count: number;
  readonly pressed: boolean;
  readonly target: ReactionTarget;
  readonly returnTo: string;
}

function ReactionButton({ kind, count, pressed, target, returnTo }: ReactionButtonProps) {
  return (
    <form action={toggleReaction}>
      <input type="hidden" name="targetKind" value={target.kind} />
      <input type="hidden" name="targetId" value={target.id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className={styles.reaction}
        aria-label={REACTION_GLYPHS[kind].label}
        aria-pressed={pressed}
      >
        <ReactionContent kind={kind} count={count} />
      </button>
    </form>
  );
}
