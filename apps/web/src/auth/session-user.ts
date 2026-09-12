// The person behind the session, as the identity provider describes them. `displayName`
// and `avatarUrl` come from Google's profile when it sent them.
export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

// What the JWT claims and the Auth `User` object have in common. Google puts the name
// under `full_name` (and `name`) and the picture under `avatar_url` (and `picture`) in
// `user_metadata`. The seed's password users carry neither.
export interface IdentityFields {
  readonly email?: string | undefined;
  readonly user_metadata?: Readonly<Record<string, unknown>> | undefined;
}

export function toSessionUser(
  id: string,
  fields: IdentityFields,
): SessionUser | undefined {
  if (fields.email === undefined || fields.email === "") {
    return undefined;
  }
  const metadata = fields.user_metadata ?? {};
  return {
    id,
    email: fields.email,
    displayName: firstString(metadata.full_name, metadata.name),
    avatarUrl: firstString(metadata.avatar_url, metadata.picture),
  };
}

function firstString(...values: readonly unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}
