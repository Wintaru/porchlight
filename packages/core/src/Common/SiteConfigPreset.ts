import type { CommentPolicy } from "./CommentPolicy";
import type { PostingPolicy } from "./PostingPolicy";
import type { SignUpPolicy } from "./SignUpPolicy";

// The setup wizard's three presets (D20, SPEC.md §4). A preset only fills these three
// keys; an admin can change any one of them later on the settings page.
export const SITE_CONFIG_PRESETS = ["just_me", "friends", "open_porch"] as const;

export type SiteConfigPreset = (typeof SITE_CONFIG_PRESETS)[number];

export interface SiteConfigPresetValues {
  readonly posting: PostingPolicy;
  readonly comments: CommentPolicy;
  readonly signUp: SignUpPolicy;
}

export const SITE_CONFIG_PRESET_VALUES: Readonly<
  Record<SiteConfigPreset, SiteConfigPresetValues>
> = {
  just_me: { posting: "staff", comments: "anyone", signUp: "closed" },
  friends: { posting: "members", comments: "anyone", signUp: "invite" },
  open_porch: { posting: "anyone", comments: "anyone", signUp: "open" },
};
