// How a caller names the profile it wants: by auth user id (the session) or by handle
// (the URL).
export type ProfileSelector =
  | { readonly by: "id"; readonly id: string }
  | { readonly by: "handle"; readonly handle: string };
