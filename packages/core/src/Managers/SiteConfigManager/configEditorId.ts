import type { Actor } from "../../Common/Actor";
import { profileIdOf, type ProfileId } from "../../Common/ProfileId";

// Who a `site_config` write is recorded against: `updated_by`, a profile id. Only a
// member can be that. If the PermissionEngine ever grants `site_config.manage` to a
// visitor or an agent, the write is refused rather than sent with a value the column
// cannot hold (#41).
export function configEditorId(actor: Actor): ProfileId | undefined {
  return actor.kind === "member" ? profileIdOf(actor.profile) : undefined;
}
