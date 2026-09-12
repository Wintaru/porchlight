// The Postgres error code the profile handlers turn into a typed response rather than a
// failure, and the constraint that makes it "handle taken". A `23505` on any other
// constraint (the primary key, when two sign-ins race) is a failure the Manager reports.
export const UNIQUE_VIOLATION = "23505";
export const HANDLE_UNIQUE_CONSTRAINT = "profiles_handle_unique";

export function isHandleTaken(error: {
  readonly code: string;
  readonly message: string;
}): boolean {
  return (
    error.code === UNIQUE_VIOLATION && error.message.includes(HANDLE_UNIQUE_CONSTRAINT)
  );
}
