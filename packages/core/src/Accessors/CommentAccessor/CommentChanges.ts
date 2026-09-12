// An edit: the new body, markdown and its render together (D3). Status, author and
// place in the tree never change through an edit.
export interface CommentChanges {
  readonly bodyMd: string;
  readonly bodyHtml: string;
}
