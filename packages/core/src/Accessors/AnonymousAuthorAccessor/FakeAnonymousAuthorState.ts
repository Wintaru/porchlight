import type { AnonymousAuthor } from "../../Common/AnonymousAuthor";
import type { AnonymousStatusItem } from "../../Common/AnonymousStatusItem";

interface FakeRow extends AnonymousAuthor {
  readonly secretHash: string;
  readonly ipHash: string | null;
}

// The fake's `anonymous_authors` table, keyed the way the store is: by id and by the
// secret hash's unique constraint. `items` lets a test seed what the status page would
// show without a post or a comment store behind it.
export class FakeAnonymousAuthorState {
  readonly bySecretHash = new Map<string, FakeRow>();
  readonly byId = new Map<string, FakeRow>();
  readonly itemsById = new Map<string, readonly AnonymousStatusItem[]>();

  constructor(readonly failing = false) {}

  store(row: FakeRow): void {
    this.bySecretHash.set(row.secretHash, row);
    this.byId.set(row.id, row);
  }

  claim(id: string, profileId: string): AnonymousAuthor | "already-claimed" | undefined {
    const row = this.byId.get(id);
    if (row === undefined) {
      return undefined;
    }
    if (row.claimedBy !== null) {
      return "already-claimed";
    }
    const claimed: FakeRow = { ...row, claimedBy: profileId };
    this.byId.set(id, claimed);
    this.bySecretHash.set(row.secretHash, claimed);
    return claimed;
  }
}
