import type { Comment } from "../../Common/Comment";
import type { CommentNode } from "./CommentNode";

// A flat list in creation order becomes the tree the page walks. A comment whose parent
// is not in the list (the parent is pending and the reader may not see it) is not
// shown either: a reply to something the reader cannot read has no place to hang.
export function buildCommentTree(comments: readonly Comment[]): readonly CommentNode[] {
  const repliesOf = new Map<string, CommentNode[]>();
  const roots: CommentNode[] = [];
  const nodes = new Map<string, CommentNode>();
  for (const comment of comments) {
    const replies: CommentNode[] = [];
    repliesOf.set(comment.id, replies);
    nodes.set(comment.id, { comment, replies });
  }
  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (node === undefined) {
      continue;
    }
    if (comment.parentId === null) {
      roots.push(node);
      continue;
    }
    repliesOf.get(comment.parentId)?.push(node);
  }
  return roots;
}
