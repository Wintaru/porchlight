// How a caller names the post it wants: by id (the editor) or by slug (the URL).
export type PostSelector =
  | { readonly by: "id"; readonly id: string }
  | { readonly by: "slug"; readonly slug: string };
