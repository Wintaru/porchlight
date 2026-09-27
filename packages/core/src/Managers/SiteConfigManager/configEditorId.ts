import type { Actor } from "../../Common/Actor";

// Who a `site_config` write is recorded against: `updated_by`, a profile id. Only a
// member can be that. If the PermissionEngine ever grants `site_config.manage` to a
// visitor or an agent, the write is refused rather than sent with a value the column
// cannot hold (#41).
export function configEditorId(actor: Actor): string | undefined {
  return actor.kind === "member" ? actor.profile.id : undefined;
}
