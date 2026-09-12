"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import type { ReactNode } from "react";

import styles from "./editor.module.css";

export type BodyMode = "rich" | "markdown";

interface EditorToolbarProps {
  readonly editor: Editor | null;
  readonly mode: BodyMode;
  readonly onModeChange: (mode: BodyMode) => void;
  readonly onInsertLink: () => void;
  readonly onInsertImage: () => void;
}

// Only what markdown can store (SPEC.md §5): bold, italic, H2, H3, link, quote, the two
// lists, code, an image by URL. The mode switch sits at the right, as on the board. The
// buttons are disabled in markdown mode: the textarea is the whole story there.
export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  onInsertLink,
  onInsertImage,
}: EditorToolbarProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      h2: current?.isActive("heading", { level: 2 }) ?? false,
      h3: current?.isActive("heading", { level: 3 }) ?? false,
      link: current?.isActive("link") ?? false,
      blockquote: current?.isActive("blockquote") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      code: current?.isActive("code") ?? false,
      codeBlock: current?.isActive("codeBlock") ?? false,
    }),
  });
  const rich = mode === "rich" && editor !== null;
  const run = (
    command: (chain: ReturnType<Editor["chain"]>) => { run: () => boolean },
  ) => {
    if (editor !== null) {
      command(editor.chain().focus()).run();
    }
  };
  const tool = (
    label: string,
    pressed: boolean,
    onClick: () => void,
    children: ReactNode,
  ) => (
    <button
      type="button"
      className={styles.tool}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={!rich}
      onMouseDown={(event) => {
        // Keep the selection in the editor: a focused button would collapse it.
        event.preventDefault();
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <div className={styles.tools}>
        {tool(
          "Bold",
          active?.bold ?? false,
          () => {
            run((c) => c.toggleBold());
          },
          <b>B</b>,
        )}
        {tool(
          "Italic",
          active?.italic ?? false,
          () => {
            run((c) => c.toggleItalic());
          },
          <i>I</i>,
        )}
        {tool(
          "Heading 2",
          active?.h2 ?? false,
          () => {
            run((c) => c.toggleHeading({ level: 2 }));
          },
          "H2",
        )}
        {tool(
          "Heading 3",
          active?.h3 ?? false,
          () => {
            run((c) => c.toggleHeading({ level: 3 }));
          },
          "H3",
        )}
        <span className={styles.divider} />
        {tool("Link", active?.link ?? false, onInsertLink, <LinkIcon />)}
        {tool(
          "Quote",
          active?.blockquote ?? false,
          () => {
            run((c) => c.toggleBlockquote());
          },
          <QuoteIcon />,
        )}
        {tool(
          "Bullet list",
          active?.bulletList ?? false,
          () => {
            run((c) => c.toggleBulletList());
          },
          <BulletListIcon />,
        )}
        {tool(
          "Numbered list",
          active?.orderedList ?? false,
          () => {
            run((c) => c.toggleOrderedList());
          },
          <OrderedListIcon />,
        )}
        <span className={styles.divider} />
        {tool(
          "Code",
          active?.code ?? false,
          () => {
            run((c) => c.toggleCode());
          },
          <CodeIcon />,
        )}
        {tool(
          "Code block",
          active?.codeBlock ?? false,
          () => {
            run((c) => c.toggleCodeBlock());
          },
          <CodeBlockIcon />,
        )}
        {tool("Image", false, onInsertImage, <ImageIcon />)}
      </div>
      <div className={styles.modes} role="group" aria-label="Body mode">
        <button
          type="button"
          className={styles.mode}
          aria-pressed={mode === "rich"}
          onClick={() => {
            onModeChange("rich");
          }}
        >
          Rich text
        </button>
        <button
          type="button"
          className={styles.mode}
          aria-pressed={mode === "markdown"}
          onClick={() => {
            onModeChange("markdown");
          }}
        >
          Markdown
        </button>
      </div>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17h4V9H6v4h2" />
      <path d="M14 17h4V9h-4v4h2" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5h1v4M4 14h2l-2 3h2" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
    </svg>
  );
}

function CodeBlockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m9 10-2 2 2 2M15 10l2 2-2 2" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
      <circle cx="16" cy="9" r="1.5" />
    </svg>
  );
}
