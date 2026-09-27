// Supabase Auth's OAuth authorization ids are short random strings (D25). Checked
// before any call, so a typed URL never reaches Auth's API as a path segment it did not
// expect.
const AUTHORIZATION_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isAuthorizationId(value: string): boolean {
  return AUTHORIZATION_ID.test(value);
}
