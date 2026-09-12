import type { Profile } from "../../Common/Profile";

// The fake's "table": profiles by id. Every fake handler holds the same instance, so a
// store shows up on the next load. `failing` makes every call answer
// ProfileAccessFailedResponse, for the error path.
export class FakeProfileState {
  readonly profiles = new Map<string, Profile>();

  constructor(readonly failing = false) {}

  byHandle(handle: string): Profile | undefined {
    for (const profile of this.profiles.values()) {
      if (profile.handle === handle) {
        return profile;
      }
    }
    return undefined;
  }
}
