// A tag as the post carries it. The slug is the URL (`/t/slug`); the name is what the
// author typed the first time the tag was used.
export interface Tag {
  readonly slug: string;
  readonly name: string;
}
