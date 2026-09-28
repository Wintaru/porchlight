// Every action the PermissionEngine can rule on. Later issues add theirs here; the
// EvaluatePermissionHandler switches over this list exhaustively, so a new action with no
// rule is a type error, not a silent deny.
export const PERMISSION_ACTIONS = [
  "profile.edit",
  "account.export",
  "account.erase",
  "post.create",
  "post.create.anonymous",
  "post.view",
  "post.list",
  "post.edit",
  "post.publish",
  "post.delete",
  "comment.create",
  "comment.create.anonymous",
  "comment.edit",
  "comment.delete",
  "reaction.toggle",
  "media.upload",
  "media.upload.anonymous",
  "media.view",
  "media.delete",
  // Deleting an upload a save or a delete left unused (#80, #90). Not `media.delete`:
  // an agent that edits its member's draft may prune, but never deletes a file outright.
  "media.prune",
  "moderation.act",
  "moderation.queue.view",
  "profile.moderate",
  "profile.promote",
  "anonymous.moderate",
  "report.file",
  "report.view",
  "site_config.manage",
  "notification.manage",
  "token.manage",
  "voice.view",
  "voice.edit",
  "member.block",
  "member.follow",
  "invite.manage",
  "presence.manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
