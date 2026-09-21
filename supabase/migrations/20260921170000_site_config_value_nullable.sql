-- Issue #38. `site_config.value` held `'null'::jsonb` for an unset key
-- (auto_promote_after_approved_posts, the off state), but PostgREST maps a JSON null in
-- a request body to SQL NULL, never to a jsonb null, so every settings-page save hit the
-- NOT NULL constraint while auto-promote was off. Readers get a JS null either way, so
-- SQL NULL is now the one store for "unset". The seed writes it the same way.
alter table public.site_config alter column value drop not null;

-- A database seeded before this migration still holds the jsonb null.
update public.site_config set value = null where value = 'null'::jsonb;

comment on column public.site_config.value is
  'The setting as JSON. NULL means unset: the key''s default applies (§7).';
