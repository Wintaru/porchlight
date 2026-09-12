// The fields a member may change on their own profile (the Settings board). A missing
// field is left as it is; `null` clears it.
export interface ProfileChanges {
  readonly handle?: string;
  readonly displayName?: string | null;
  readonly bio?: string | null;
  readonly avatarUrl?: string | null;
}
