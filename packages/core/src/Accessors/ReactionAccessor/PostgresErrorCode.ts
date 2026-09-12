// The Postgres error the reaction handlers turn into a typed response: the same member
// reacting the same way twice trips the per-member key, which the Manager reads as
// "already there, so take it back" (a toggle).
export const UNIQUE_VIOLATION = "23505";
export const PER_MEMBER_CONSTRAINT = "reactions_unique_per_member";

export function isAlreadyReacted(error: {
  readonly code: string;
  readonly message: string;
}): boolean {
  return error.code === UNIQUE_VIOLATION && error.message.includes(PER_MEMBER_CONSTRAINT);
}
