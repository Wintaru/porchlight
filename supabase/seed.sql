-- Local seed. Runs after the migrations on `supabase db reset` (config.toml [db.seed]).
-- Fixed ids so the RLS tests in packages/db and the Playwright flows can point at rows.
-- Every member signs in locally with email <handle>@porchlight.local, password `porchlight`.
-- Nothing here is production data.

-- Members ----------------------------------------------------------------------------

-- auth.users rows the way Supabase Auth writes them, so password sign-in works on the
-- local stack without Google (docs/setup/supabase.md). extensions.crypt is pgcrypto.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('porchlight', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'lamplighter@porchlight.local'),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'mira@porchlight.local'),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'theo@porchlight.local'),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'june@porchlight.local'),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'ivy@porchlight.local')
) as seed_users (id, email);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email like '%@porchlight.local';

insert into public.profiles (id, handle, display_name, bio, role, trust_level) values
  ('00000000-0000-4000-8000-000000000001', 'lamplighter', 'The Lamplighter',
   'Keeps the light on. Site admin.', 'admin', 'trusted'),
  ('00000000-0000-4000-8000-000000000002', 'mira', 'Mira Okafor',
   'Moderator. Reads everything twice.', 'moderator', 'trusted'),
  ('00000000-0000-4000-8000-000000000003', 'theo', 'Theo Lindqvist',
   'Trusted member. Writes about wood and weather.', 'member', 'trusted'),
  ('00000000-0000-4000-8000-000000000004', 'june', 'June Park',
   'New here. On probation until the first few posts are approved.', 'member', 'probation'),
  -- Trusted, and otherwise empty (§10): the Playwright export/erasure flow creates and
  -- deletes her own posts and comments, so no other test's fixture data lives on her.
  ('00000000-0000-4000-8000-000000000006', 'ivy', 'Ivy Marchetti',
   'Trusted member.', 'member', 'trusted');

-- One erased member (§10): no auth user, personal fields null, the handle kept so
-- /@wren answers 410 Gone (D11).
insert into public.profiles (id, handle, role, trust_level, status) values
  ('00000000-0000-4000-8000-000000000005', 'wren', 'member', 'trusted', 'erased');

-- Quota rows for every member. Theo's counts his one approved upload below.
insert into public.quotas (profile_id, bytes_used, files_count)
select id, 0, 0 from public.profiles;
update public.quotas set bytes_used = 184320, files_count = 1
where profile_id = '00000000-0000-4000-8000-000000000003';

-- One anonymous author (D7). Secret: `seed-anonymous-secret`, stored as its SHA-256.
insert into public.anonymous_authors (id, secret_hash, ip_hash) values (
  '00000000-0000-4000-8000-0000000000a1',
  encode(extensions.digest('seed-anonymous-secret', 'sha256'), 'hex'),
  encode(extensions.digest('seed-salt:203.0.113.7', 'sha256'), 'hex')
);

-- Tags ---------------------------------------------------------------------------------

insert into public.tags (id, slug, name) values
  ('00000000-0000-4000-8000-0000000000e1', 'mature', 'Mature'),
  ('00000000-0000-4000-8000-0000000000e2', 'porch-talk', 'Porch talk'),
  ('00000000-0000-4000-8000-0000000000e3', 'making', 'Making'),
  ('00000000-0000-4000-8000-0000000000e4', 'hiking', 'Hiking');

-- Media --------------------------------------------------------------------------------

-- One approved image (cover of the first post) and one still in quarantine.
insert into public.media_assets (
  id, owner_id, storage_path, published_path, kind, mime_type, original_filename, bytes,
  sha256, scan_status
) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000003',
   'quarantine/theo/porch-at-dusk.jpg', 'public-media/theo/porch-at-dusk.jpg', 'image',
   'image/jpeg', 'porch-at-dusk.jpg', 184320,
   encode(extensions.digest('seed-media-1', 'sha256'), 'hex'), 'clear'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000004',
   'quarantine/june/first-trail.jpg', null, 'image', 'image/jpeg', 'first-trail.jpg',
   90112, encode(extensions.digest('seed-media-2', 'sha256'), 'hex'), 'pending');

-- Posts --------------------------------------------------------------------------------

insert into public.posts (
  id, author_id, anonymous_author_id, slug, title, summary, body_md, body_html,
  cover_media_id, status, visibility, published_at
) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', null,
   'welcome-to-porchlight', 'Welcome to Porchlight',
   'What this place is, and what it is not.',
   E'The light is on. Pull up a chair.\n\nNo karma, no downvotes, no leaderboards.',
   '<p>The light is on. Pull up a chair.</p><p>No karma, no downvotes, no leaderboards.</p>',
   null, 'published', 'public', now() - interval '3 days'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000003', null,
   'hello-from-the-porch', 'Hello from the porch',
   'A first post about a bench that took three weekends.',
   E'I built a bench. It wobbles. I am fine with that.\n\n![The porch at dusk](porch-at-dusk.jpg)',
   '<p>I built a bench. It wobbles. I am fine with that.</p>',
   '00000000-0000-4000-8000-0000000000d1', 'published', 'public', now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000003', null,
   'an-unlisted-note', 'An unlisted note', null,
   'Only people with the link should read this.',
   '<p>Only people with the link should read this.</p>',
   null, 'published', 'unlisted', now() - interval '1 day'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000003', null,
   'half-a-thought', 'Half a thought', null, 'Not done yet.', '<p>Not done yet.</p>',
   null, 'draft', 'public', null),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-000000000004', null,
   'first-post-waiting-for-the-light', 'First post, waiting for the light',
   'A probation member''s first post, in the queue.',
   'Hi. I hike. I will write about hiking.', '<p>Hi. I hike. I will write about hiking.</p>',
   null, 'pending', 'public', null),
  ('00000000-0000-4000-8000-0000000000b6', null, '00000000-0000-4000-8000-0000000000a1',
   'a-note-left-on-the-step', 'A note left on the step', null,
   'I do not have an account. Is that okay?', '<p>I do not have an account. Is that okay?</p>',
   null, 'pending', 'public', null);

insert into public.post_tags (post_id, tag_id) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000e2'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000e3'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000e4');

-- Comments on "Hello from the porch" ---------------------------------------------------

insert into public.comments (
  id, post_id, parent_id, author_id, anonymous_author_id, body_md, body_html, depth, status
) values
  -- A visible root comment and a visible reply.
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b2', null,
   '00000000-0000-4000-8000-000000000002', null, 'The wobble is character.',
   '<p>The wobble is character.</p>', 0, 'visible'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b2',
   '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000003', null,
   'I will tell the bench you said so.', '<p>I will tell the bench you said so.</p>', 1, 'visible'),
  -- A tombstone (D5) with a visible reply under it.
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000b2', null,
   null, null, '', '', 0, 'tombstone'),
  ('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000000b2',
   '00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001', null,
   'This reply stays readable after the parent was erased.',
   '<p>This reply stays readable after the parent was erased.</p>', 1, 'visible'),
  -- A probation member's reply, waiting in the queue.
  ('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-0000000000b2',
   '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000004', null,
   'Can I see it sometime?', '<p>Can I see it sometime?</p>', 1, 'pending');

insert into public.reactions (post_id, comment_id, profile_id, kind) values
  ('00000000-0000-4000-8000-0000000000b2', null, '00000000-0000-4000-8000-000000000001', 'heart'),
  ('00000000-0000-4000-8000-0000000000b2', null, '00000000-0000-4000-8000-000000000002', 'clap'),
  (null, '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000003', 'laugh');

-- Evidence and the queue ---------------------------------------------------------------

-- The envelope of the anonymous post (§7). Raw IP kept for the 90-day window.
insert into public.submission_evidence (
  subject_kind, subject_id, anonymous_author_id, source_ip, source_port, raw_ip_expires_at,
  ip_hash, user_agent, turnstile_result, request_id
) values (
  'post', '00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000a1',
  '203.0.113.7', 51844, now() + interval '90 days',
  encode(extensions.digest('seed-salt:203.0.113.7', 'sha256'), 'hex'),
  'Mozilla/5.0 (seed)', 'pass', 'seed-request-1'
);

-- The admin and the moderator each have a queue.pending bell for it (D13).
insert into public.notifications (recipient_id, kind, post_id, payload) values
  ('00000000-0000-4000-8000-000000000001', 'queue.pending',
   '00000000-0000-4000-8000-0000000000b6', '{"title":"A note left on the step"}'),
  ('00000000-0000-4000-8000-000000000002', 'queue.pending',
   '00000000-0000-4000-8000-0000000000b6', '{"title":"A note left on the step"}');

insert into public.audit_log (actor_id, event, subject_kind, subject_id, details) values
  (null, 'seed.loaded', null, null, '{"source":"supabase/seed.sql"}');

-- Site config: the maximum-caution defaults (§7) ---------------------------------------

insert into public.site_config (key, value) values
  ('region', '"other"'),
  ('posting', '"anyone"'),
  ('comments', '"anyone"'),
  ('sign_up', '"open"'),
  ('site_name', '"Porchlight"'),
  ('site_tagline', '""'),
  ('about_md', '""'),
  ('attachment_allowlist', '["png","jpeg","gif","webp","avif","pdf","docx","xlsx","pptx","odt","ods","odp","txt","md","csv","stl","gpx"]'),
  ('anonymous_upload_cap', '{"files":3,"bytes_per_file":2097152}'),
  ('attachment_quota_by_trust', '{"probation":{"max_file_bytes":5242880,"max_account_bytes":26214400},"trusted":{"max_file_bytes":20971520,"max_account_bytes":209715200}}'),
  ('moderation_thresholds', '{"flag_at":0.5,"lock_at":0.9}'),
  ('auto_promote_after_approved_posts', 'null'),
  ('raw_ip_retention_days', '90');
