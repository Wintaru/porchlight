import type { Profile } from "./Profile";

// A profile id that came from a loaded profile, never a raw string from a form or a
// token (C22). Branded, so a write that records who made it cannot carry an arbitrary
// string in that place. Only the `site_config` write path uses it so far (#96).
export type ProfileId = string & { readonly __brand: "ProfileId" };

// The one way to mint a ProfileId: the id of a profile the store already returned.
export function profileIdOf(profile: Profile): ProfileId {
  return profile.id as ProfileId;
}
