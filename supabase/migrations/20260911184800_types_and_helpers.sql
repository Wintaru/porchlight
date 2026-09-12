-- Enum types and trigger helpers shared by the phase 1 tables (SPEC.md §4, §5, §7, §8).
--
-- Each fixed value set is a Postgres enum, not a text column with a CHECK. The generated
-- types in packages/db turn an enum into a string-literal union, so application code and
-- the database share one definition and an unknown status fails to type-check.

create type public.user_role as enum ('admin', 'moderator', 'member');
create type public.trust_level as enum ('probation', 'trusted');
create type public.profile_status as enum ('active', 'suspended', 'banned', 'erased');

create type public.post_status as enum (
  'draft',
  'pending',
  'published',
  'rejected',
  'hidden',
  'removed'
);
create type public.post_visibility as enum ('public', 'unlisted');
create type public.comment_status as enum (
  'pending',
  'visible',
  'rejected',
  'hidden',
  'removed',
  'tombstone'
);

-- The small fixed reaction set (D9). Names, not glyphs: the UI maps a name to its emoji.
create type public.reaction_kind as enum ('heart', 'laugh', 'wow', 'sad', 'clap');

create type public.media_kind as enum ('image', 'document', 'model', 'track', 'video');
create type public.scan_status as enum ('pending', 'clear', 'flagged', 'locked');

-- What an evidence envelope or a moderation record points at.
create type public.subject_kind as enum ('post', 'comment', 'media');
create type public.turnstile_result as enum ('pass', 'fail', 'not_required');

-- Report reasons mirror the code of conduct. 'illegal_content' escalates at once (§7).
create type public.report_reason as enum (
  'harassment',
  'hate',
  'spam',
  'sexual_content',
  'violence',
  'self_harm',
  'copyright',
  'other',
  'illegal_content'
);
create type public.report_status as enum ('open', 'escalated', 'resolved', 'dismissed');

-- The moderator actions listed in SPEC.md §7, one enum value each.
create type public.mod_action_kind as enum (
  'approve',
  'approve_mature',
  'reject',
  'hide',
  'remove',
  'lock_thread',
  'suspend',
  'ban',
  'block_anonymous',
  'escalate',
  'mark_trusted'
);

-- The five phase 1 notification events (D13).
create type public.notification_kind as enum (
  'queue.pending',
  'reply.created',
  'item.approved',
  'item.rejected',
  'report.filed',
  'mod.action'
);

create type public.region as enum ('US', 'EU', 'UK', 'CA', 'AU', 'other');

-- Keeps updated_at honest on every table that carries one.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A locked item and its frozen evidence cannot be deleted before retain_until (§7).
-- Runs for every role, the service role included. TRUNCATE skips row triggers, so the
-- retained tables also get refuse_truncate below.
create function public.refuse_delete_before_retain_until()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.retain_until is not null and old.retain_until > now() then
    raise exception 'row % is retained until %', old.id, old.retain_until
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

-- The audit log is append-only. Rows may be pruned only after the one-year retention.
create function public.refuse_audit_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'audit_log rows cannot be updated' using errcode = 'check_violation';
  end if;
  if old.created_at > now() - interval '1 year' then
    raise exception 'audit_log row % is within the retention period', old.id
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

-- TRUNCATE does not fire row-level delete triggers, so the retained tables refuse it.
create function public.refuse_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'truncate is not allowed on %', tg_table_name using errcode = 'check_violation';
end;
$$;
