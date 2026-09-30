"use client";

import type { ReactionTarget } from "@porchlight/core";
import { type SubmitEvent, useOptimistic, useState, useTransition } from "react";

import { toggleReaction, toggleReactionInPlace } from "@/app/[handle]/[slug]/actions";
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
//
// With JavaScript a tap shows at once and saves in place: the rest of the page does not
// render again. With none, each button is a plain form post and the page comes back.
export function ReactionBar({ target, reactions, canReact, returnTo }: ReactionBarProps) {
  // Taps saved since the page rendered, kept only while the page still shows the same
  // counts: a new render (after a comment, say) starts from what it read.
  const [saved, setSaved] = useState<{
    readonly base: ItemReactions;
    readonly value: ItemReactions;
  }>();
  const current = saved?.base === reactions ? saved.value : reactions;
  const [shown, showTap] = useOptimistic(
    current,
    (state, tap: { readonly kind: ReactionKind; readonly on: boolean }) =>
      toggled(state, tap.kind, tap.on),
  );
  const [, startTransition] = useTransition();

  const tap = (kind: ReactionKind) => (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // The state the tap asks for, not a flip: replayed on a newer base it stays right.
    const on = !shown.mine.has(kind);
    startTransition(async () => {
      showTap({ kind, on });
      // A refusal redirects with an error code, as the form post does; the call then
      // throws, and the tap is undone.
      const reacted = await toggleReactionInPlace(form);
      startTransition(() => {
        setSaved((before) => {
          const from = before?.base === reactions ? before.value : reactions;
          return { base: reactions, value: toggled(from, kind, reacted) };
        });
      });
    });
  };

  const used = REACTION_KINDS.filter((kind) => shown.counts[kind] > 0);
  const unused = REACTION_KINDS.filter((kind) => shown.counts[kind] === 0);
  if (used.length === 0 && !canReact) {
    return null;
  }
  const button = (kind: ReactionKind) => (
    <ReactionButton
      kind={kind}
      count={shown.counts[kind]}
      pressed={shown.mine.has(kind)}
      target={target}
      returnTo={returnTo}
      onSubmit={tap(kind)}
    />
  );
  return (
    <ul className={styles.reactions} aria-label="Reactions" data-testid="reactions">
      {used.map((kind) => (
        <li key={kind}>
          {canReact ? (
            button(kind)
          ) : (
            <ReactionCount kind={kind} count={shown.counts[kind]} />
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
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}

function ReactionButton({
  kind,
  count,
  pressed,
  target,
  returnTo,
  onSubmit,
}: ReactionButtonProps) {
  return (
    <form action={toggleReaction} onSubmit={onSubmit}>
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

// `reactions` with the member's `kind` turned on or off. A no-op when it already is.
function toggled(
  reactions: ItemReactions,
  kind: ReactionKind,
  on: boolean,
): ItemReactions {
  if (reactions.mine.has(kind) === on) {
    return reactions;
  }
  const mine = new Set(reactions.mine);
  if (on) {
    mine.add(kind);
  } else {
    mine.delete(kind);
  }
  return {
    counts: { ...reactions.counts, [kind]: reactions.counts[kind] + (on ? 1 : -1) },
    mine,
  };
}
