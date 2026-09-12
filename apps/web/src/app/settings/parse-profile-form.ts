// The edge of the settings form: trims, caps lengths, and turns empty text into `null`
// so a cleared field clears the column. The handle rules themselves belong to the
// PermissionEngine; only the sizes are decided here.
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const BIO_MAX_LENGTH = 500;

export interface ProfileFormChanges {
  readonly handle: string;
  readonly displayName: string | null;
  readonly bio: string | null;
}

export type ProfileFormResult =
  | { readonly ok: true; readonly changes: ProfileFormChanges }
  | { readonly ok: false; readonly error: "display-name-length" | "bio-length" };

export function parseProfileForm(formData: FormData): ProfileFormResult {
  const handle = text(formData, "handle");
  const displayName = text(formData, "displayName");
  const bio = text(formData, "bio");
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, error: "display-name-length" };
  }
  if (bio.length > BIO_MAX_LENGTH) {
    return { ok: false, error: "bio-length" };
  }
  return {
    ok: true,
    changes: {
      handle,
      displayName: displayName === "" ? null : displayName,
      bio: bio === "" ? null : bio,
    },
  };
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
