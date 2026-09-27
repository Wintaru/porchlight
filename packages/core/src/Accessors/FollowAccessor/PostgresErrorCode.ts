// The Postgres errors the follow handlers turn into typed responses: a second follow of
// the same target trips a unique index (already following, so nothing to do), and a
// target that is not there trips a foreign key.
export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";
