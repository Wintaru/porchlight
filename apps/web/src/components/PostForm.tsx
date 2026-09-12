import type { Post } from "@porchlight/core";

import {
  BODY_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/app/write/parse-post-form";

interface PostFormProps {
  readonly action: (formData: FormData) => Promise<void>;
  readonly post?: Post;
  readonly canPublish: boolean;
}

// The editor as a plain form: title, markdown body, summary, tags, visibility and the
// comments switch (D20). Two submit buttons share it and send their own `intent`. #6
// replaces the body field with Tiptap and the sidebar with the Editor board.
export function PostForm({ action, post, canPublish }: PostFormProps) {
  return (
    <form action={action}>
      {post !== undefined && <input type="hidden" name="postId" value={post.id} />}
      <label>
        Title
        <input
          type="text"
          name="title"
          defaultValue={post?.title ?? ""}
          maxLength={TITLE_MAX_LENGTH}
          required
        />
      </label>
      <label>
        Body (markdown)
        <textarea
          name="bodyMd"
          defaultValue={post?.bodyMd ?? ""}
          maxLength={BODY_MAX_LENGTH}
          rows={16}
        />
      </label>
      <label>
        Summary for the preview card
        <input
          type="text"
          name="summary"
          defaultValue={post?.summary ?? ""}
          maxLength={SUMMARY_MAX_LENGTH}
        />
      </label>
      <label>
        Tags (comma separated)
        <input
          type="text"
          name="tags"
          defaultValue={post?.tags.map((tag) => tag.name).join(", ") ?? ""}
        />
      </label>
      <label>
        Visibility
        <select name="visibility" defaultValue={post?.visibility ?? "public"}>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted (link only)</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          name="commentsEnabled"
          defaultChecked={post?.commentsEnabled ?? true}
        />
        Allow comments
      </label>
      <button type="submit" name="intent" value="save">
        Save draft
      </button>
      {canPublish && (
        <button type="submit" name="intent" value="publish">
          Publish
        </button>
      )}
    </form>
  );
}
