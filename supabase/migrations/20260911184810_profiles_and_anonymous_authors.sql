-- People (SPEC.md §4): members and anonymous authors.

-- profiles.id equals auth.users.id, set by the profile creation in the auth flow. There
-- is no foreign key on purpose: erasure (§10) deletes the auth user last and keeps the
-- profile as `erased` with personal fields nulled, so /@handle can answer 410 Gone.
create table public.profiles (
  id uuid primary key,
  handle text not null,
  display_name text,
  avatar_url text,
  bio text,
  role public.user_role not null default 'member',
  trust_level public.trust_level not null default 'probation',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_shape check (handle ~ '^[a-z0-9][a-z0-9_-]{1,29}$'),
  constraint profiles_handle_unique unique (handle),
  -- An erased profile keeps only its id and handle (for the 410) and its role.
  constraint profiles_erased_is_blank check (
    status <> 'erased'
    or (display_name is null and avatar_url is null and bio is null)
  )
);

comment on table public.profiles is
  'One row per member. id = auth.users.id. Kept as erased after account deletion (§10).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- An anonymous author is a random 256-bit secret, stored only as its SHA-256 (D7). The
-- claim flow moves this author's posts and comments to a profile and sets claimed_by.
create table public.anonymous_authors (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  -- Salted hash of the first IP seen, for the D15 block list. Never the raw address.
  ip_hash text,
  claimed_by uuid references public.profiles (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint anonymous_authors_secret_hash_unique unique (secret_hash),
  constraint anonymous_authors_secret_hash_is_sha256 check (secret_hash ~ '^[0-9a-f]{64}$'),
  constraint anonymous_authors_claim_pair check ((claimed_by is null) = (claimed_at is null))
);

comment on table public.anonymous_authors is
  'A visitor who wrote without an account. secret_hash = sha256(cookie secret) (D7).';
