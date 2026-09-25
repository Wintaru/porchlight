-- #37: the hash now follows the author. Every admitted write from a returning cookie
-- stores the address it came from, so BlockAnonymous blocks where they write from now,
-- not only where they first wrote.
comment on column public.anonymous_authors.ip_hash is
  'Salted hash of the most recent address this author wrote from (D15). Never the raw address.';

-- Before #37 every author row got the hash of whatever address the request carried,
-- including the placeholder every caller shares when no trusted proxy is set. A block
-- now copies the row's hash, so such a row would block every anonymous writer. SQL
-- cannot tell the placeholder's salted hash from a real one, and nothing is live yet,
-- so every stored hash is cleared; the guard writes real ones from here on.
update public.anonymous_authors set ip_hash = null;
