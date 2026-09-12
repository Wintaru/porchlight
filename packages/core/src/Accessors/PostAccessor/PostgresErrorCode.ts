// The Postgres error code the post handlers turn into a typed response rather than a
// failure, and the constraint that makes it "slug taken".
export const UNIQUE_VIOLATION = "23505";
export const SLUG_UNIQUE_CONSTRAINT = "posts_slug_unique";

export function isSlugTaken(error: {
  readonly code: string;
  readonly message: string;
}): boolean {
  return (
    error.code === UNIQUE_VIOLATION && error.message.includes(SLUG_UNIQUE_CONSTRAINT)
  );
}
