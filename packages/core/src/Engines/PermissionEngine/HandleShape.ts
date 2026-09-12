// The shape of a handle, the same rule as the `profiles_handle_shape` CHECK in the schema:
// lowercase letters, digits, `_` and `-`, 2 to 30 characters, starting with a letter or a
// digit. Kept here so the Engine can refuse before the round trip and name the reason.
export const HANDLE_MIN_LENGTH = 2;
export const HANDLE_MAX_LENGTH = 30;

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/;

export function hasHandleShape(value: string): boolean {
  return HANDLE_PATTERN.test(value);
}

// Turns free text (an email's local part, a display name) into the longest prefix that
// has the handle shape: lowercased, every run of other characters becomes one `-`, and
// the ends lose their `-` and `_`. Returns "" when nothing usable is left.
export function toHandleShape(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH);
}
