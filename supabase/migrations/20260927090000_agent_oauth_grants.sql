-- Issue #79 (D25, D22, SPEC.md §17): OAuth grants for MCP clients such as claude.ai
-- connectors. Supabase Auth is the OAuth 2.1 server, but it has no custom scopes, so
-- the Porchlight scopes a member picks on the consent page are stored here, as an agent
-- token keyed by the OAuth client instead of by a hash. Every other path that knows an
-- agent token (post provenance, evidence, rate limits, the settings list and revoke,
-- export, erasure) then covers an OAuth grant with no second copy.

alter table public.agent_tokens
  alter column token_hash drop not null,
  -- Supabase Auth's OAuth client id, a UUID. No foreign key: the auth schema is Auth's.
  add column oauth_client_id uuid;

-- A row is either a personal token or an OAuth grant, never both and never neither.
alter table public.agent_tokens
  add constraint agent_tokens_one_credential
  check ((token_hash is null) <> (oauth_client_id is null));

-- One live grant per member and client: consenting again revokes the old row first, and
-- a bearer token resolves to exactly one grant.
create unique index agent_tokens_live_oauth_grant_idx
  on public.agent_tokens (owner_id, oauth_client_id)
  where oauth_client_id is not null and revoked_at is null;

comment on column public.agent_tokens.oauth_client_id is 'Set for an OAuth grant (D25): the Supabase Auth OAuth client the member approved. Null for a personal plt_ token.';
