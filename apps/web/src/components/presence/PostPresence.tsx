"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  joinPresence,
  POST_PRESENCE_TOPIC,
  type PresenceHandle,
  type PresentMember,
} from "@/read-model/presence";

import styles from "./presence.module.css";

interface PostPresenceProps {
  readonly postId: string;
  readonly selfId: string;
  readonly visible: boolean;
  // Members this viewer muted or blocked (#23): never shown to them.
  readonly hiddenIds: readonly string[];
  readonly children: ReactNode;
}

const TypingContext = createContext<(typing: boolean) => void>(() => undefined);

// A comment box reports typing through this. Outside a PostPresence it does nothing.
export function useSetTyping(): (typing: boolean) => void {
  return useContext(TypingContext);
}

function sentence(handles: readonly string[]): string {
  const named = handles.map((handle) => `@${handle}`);
  if (named.length === 1) {
    return `${named[0] ?? ""} is replying…`;
  }
  if (named.length === 2) {
    return `${named[0] ?? ""} and ${named[1] ?? ""} are replying…`;
  }
  return `${String(named.length)} people are replying…`;
}

// The post's presence channel (#75): who else is typing a comment, shown above the
// comments, never the viewer themselves or anyone they muted or blocked.
export function PostPresence({
  postId,
  selfId,
  visible,
  hiddenIds,
  children,
}: PostPresenceProps) {
  const [members, setMembers] = useState<readonly PresentMember[]>([]);
  const handleRef = useRef<PresenceHandle | null>(null);

  useEffect(() => {
    const presence = joinPresence(
      POST_PRESENCE_TOPIC(postId),
      selfId,
      visible,
      setMembers,
    );
    handleRef.current = presence;
    return () => {
      handleRef.current = null;
      presence.leave();
    };
  }, [postId, selfId, visible]);

  // One function for the page's life: a comment box's effect depends on it, and a new
  // one on each presence change would make the box clear its own typing state.
  const setTyping = useCallback((value: boolean) => {
    handleRef.current?.setTyping(value);
  }, []);

  const hidden = new Set(hiddenIds);
  const typing = members
    .filter((member) => member.typing && member.id !== selfId && !hidden.has(member.id))
    .map((member) => member.handle)
    .sort();

  return (
    <TypingContext.Provider value={setTyping}>
      <p className={styles.typing} aria-live="polite" data-testid="typing-indicator">
        {typing.length > 0 ? sentence(typing) : ""}
      </p>
      {children}
    </TypingContext.Provider>
  );
}
