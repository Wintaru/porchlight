"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import { EDITOR_EXTENSIONS } from "./editor-extensions";
import styles from "./editor.module.css";
import { type BodyMode, EditorToolbar } from "./EditorToolbar";
import { trimBlankEnds } from "./trim-blank-ends";
import { UrlDialog, type UrlDialogKind, type UrlDialogValue } from "./UrlDialog";

interface BodyEditorProps {
  readonly initialMarkdown: string;
  readonly onChange: (markdown: string) => void;
}

// The body: Tiptap in rich mode, a textarea over the same markdown in markdown mode.
// Markdown is the one truth (SPEC.md §2): the hidden `bodyMd` field carries it to the
// form, the rich view serializes to it on every edit, and switching to rich mode parses
// it back. A body that is never touched is submitted as it was loaded, byte for byte.
export function BodyEditor({ initialMarkdown, onChange }: BodyEditorProps) {
  const [mode, setMode] = useState<BodyMode>("rich");
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [dialog, setDialog] = useState<UrlDialogKind | null>(null);
  const [dialogUrl, setDialogUrl] = useState("");
  // The editor is built once; the latest `onChange` is read through a ref so the
  // parent may pass a new function on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: initialMarkdown,
    contentType: "markdown",
    // Tiptap renders on the client only; the server sends the markdown in the form.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.prose ?? "",
        role: "textbox",
        "aria-label": "Body",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = trimBlankEnds(current.getMarkdown());
      setMarkdown(next);
      onChangeRef.current(next);
    },
  });

  const changeMode = (next: BodyMode) => {
    if (next === mode) {
      return;
    }
    if (next === "rich" && editor !== null) {
      // A view flip is not an edit: the typed text stands until the first keystroke.
      editor.commands.setContent(markdown, {
        contentType: "markdown",
        emitUpdate: false,
      });
    }
    setMode(next);
  };

  const openDialog = (kind: UrlDialogKind) => {
    const href: unknown = editor?.getAttributes("link").href;
    setDialogUrl(kind === "link" && typeof href === "string" ? href : "");
    setDialog(kind);
  };

  // The value is applied once the dialog has closed: a modal blocks focus, and a
  // command that cannot focus the editor leaves the next keystrokes going nowhere.
  const pendingRef = useRef<{ kind: UrlDialogKind; value: UrlDialogValue } | null>(null);
  const applyDialog = (value: UrlDialogValue) => {
    if (dialog !== null) {
      pendingRef.current = { kind: dialog, value };
    }
    setDialog(null);
  };
  const dialogClosed = () => {
    setDialog(null);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (editor === null) {
      return;
    }
    if (pending === null) {
      editor.commands.focus();
      return;
    }
    const { url, alt } = pending.value;
    if (pending.kind === "image") {
      if (url !== "") {
        editor.chain().focus().setImage({ src: url, alt }).run();
      } else {
        editor.commands.focus();
      }
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url === "") {
      chain.unsetLink().run();
      return;
    }
    if (editor.state.selection.empty) {
      // Nothing selected: the URL is the link's text.
      chain
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
      return;
    }
    // The cursor lands after the link, so typing goes on past it.
    chain.setLink({ href: url }).setTextSelection(editor.state.selection.to).run();
  };

  return (
    <>
      <input type="hidden" name="bodyMd" value={markdown} />
      <EditorToolbar
        editor={editor}
        mode={mode}
        onModeChange={changeMode}
        onInsertLink={() => {
          openDialog("link");
        }}
        onInsertImage={() => {
          openDialog("image");
        }}
      />
      <div className={styles.body} hidden={mode !== "rich"}>
        <EditorContent editor={editor} />
      </div>
      {mode === "markdown" && (
        <textarea
          className={styles.markdown}
          aria-label="Body (markdown)"
          value={markdown}
          spellCheck={false}
          onChange={(event) => {
            setMarkdown(event.target.value);
            onChangeRef.current(event.target.value);
          }}
        />
      )}
      <UrlDialog
        kind={dialog}
        initialUrl={dialogUrl}
        onSubmit={applyDialog}
        onClose={dialogClosed}
      />
    </>
  );
}
