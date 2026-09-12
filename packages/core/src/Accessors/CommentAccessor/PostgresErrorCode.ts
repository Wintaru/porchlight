// The Postgres error the comment handlers turn into a typed response rather than a
// failure: deleting a parent that still has replies trips the no-cascade key (D5).
export const FOREIGN_KEY_VIOLATION = "23503";
export const PARENT_KEY_CONSTRAINT = "comments_parent_id_fkey";

export function isParentStillReferenced(error: {
  readonly code: string;
  readonly message: string;
}): boolean {
  return (
    error.code === FOREIGN_KEY_VIOLATION && error.message.includes(PARENT_KEY_CONSTRAINT)
  );
}
