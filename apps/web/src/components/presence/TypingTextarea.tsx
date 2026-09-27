"use client";

import { type ComponentProps, useEffect, useRef } from "react";

import { useSetTyping } from "./PostPresence";

// How long after the last keystroke a member stops showing as typing.
const IDLE_MS = 4000;

// A comment box that tells the post's presence channel while its member types (#75).
// Outside a PostPresence (a visitor, a member who turned presence off) it is a plain
// textarea.
export function TypingTextarea(props: ComponentProps<"textarea">) {
  const setTyping = useSetTyping();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      setTyping(false);
    },
    [setTyping],
  );

  return (
    <textarea
      {...props}
      onInput={() => {
        setTyping(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setTyping(false);
        }, IDLE_MS);
      }}
      onBlur={() => {
        clearTimeout(timer.current);
        setTyping(false);
      }}
    />
  );
}
