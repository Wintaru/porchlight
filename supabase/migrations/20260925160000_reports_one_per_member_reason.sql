-- #56: a member's report stands once per item and reason while it waits for a
-- moderator. A second press is not a second report: it would notify every moderator
-- again and grow the reports page. A different reason is a different report, so an
-- illegal-content report is never swallowed by an earlier spam one. Visitors have no
-- reporter_id; the anonymous guard's rate limit bounds theirs.
-- Nothing stopped a repeat before, so keep only the first of any open repeats, or the
-- indexes below cannot be built.
delete from public.reports later
using public.reports earlier
where later.reporter_id is not null
  and later.reporter_id = earlier.reporter_id
  and later.reason = earlier.reason
  and later.post_id is not distinct from earlier.post_id
  and later.comment_id is not distinct from earlier.comment_id
  and later.status in ('open', 'escalated')
  and earlier.status in ('open', 'escalated')
  and (later.created_at, later.id) > (earlier.created_at, earlier.id);

create unique index reports_one_open_per_member_post
  on public.reports (reporter_id, post_id, reason)
  where reporter_id is not null and post_id is not null and status in ('open', 'escalated');

create unique index reports_one_open_per_member_comment
  on public.reports (reporter_id, comment_id, reason)
  where reporter_id is not null and comment_id is not null and status in ('open', 'escalated');
