// What a new agent token row is keyed by: a personal token's hash, or, for an OAuth
// grant (D25), the OAuth client the member approved. The schema's check makes a row
// carry exactly one, and this union makes a request unable to name both or neither.
export type NewAgentTokenCredential =
  | { readonly kind: "hash"; readonly tokenHash: string }
  | { readonly kind: "oauth"; readonly clientId: string };
