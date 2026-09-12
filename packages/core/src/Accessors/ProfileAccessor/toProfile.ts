import type { Tables } from "@porchlight/db";

import type { Profile } from "../../Common/Profile";

// The columns every profile read names. Never `select *`: the row grant is a column list
// and the shape here is the one the mapper below expects.
export const PROFILE_COLUMNS =
  "id, handle, display_name, avatar_url, bio, role, trust_level, status, created_at";

export type ProfileRow = Pick<
  Tables<"profiles">,
  | "id"
  | "handle"
  | "display_name"
  | "avatar_url"
  | "bio"
  | "role"
  | "trust_level"
  | "status"
  | "created_at"
>;

// The domain unions in Common restate the schema's enums, because Common cannot import
// packages/db. The assignments below only compile while the schema's values are all in
// the domain union; toProfile.test.ts checks the other direction against the generated
// constants, so a value added on either side without the other fails the gate.
export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
    trustLevel: row.trust_level,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}
