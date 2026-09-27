// A post's or comment's markdown and the HTML cached from it (D3), for the one-time
// re-render when the render pipeline changes (#77).
export interface StoredBody {
  readonly id: string;
  readonly bodyMd: string;
  readonly bodyHtml: string;
}
