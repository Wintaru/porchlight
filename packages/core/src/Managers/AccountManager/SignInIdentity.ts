// What the identity provider told the Client about the person who just signed in. The
// Client reads it off the Supabase user (email, and the Google name and picture from
// `user_metadata` when present).
export interface SignInIdentity {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}
