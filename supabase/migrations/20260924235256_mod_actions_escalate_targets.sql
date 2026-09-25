-- The queue marks escalated items (#49): one read per queue page asks which pending
-- posts and comments have an `escalate` row. Partial indexes keep that read off the
-- whole, ever-growing action log.
create index mod_actions_escalated_post_idx on public.mod_actions (target_post_id)
  where action = 'escalate' and target_post_id is not null;

create index mod_actions_escalated_comment_idx on public.mod_actions (target_comment_id)
  where action = 'escalate' and target_comment_id is not null;
