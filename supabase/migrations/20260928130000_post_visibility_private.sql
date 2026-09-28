-- Issue #101 (D27): a third visibility, `private`, beside D18's `public` and
-- `unlisted`. A private post is finished and dated, and only its author may read it.
--
-- A new enum value cannot be used in the transaction that adds it, and the CLI runs a
-- migration file as one transaction. The rules that use it are in the next migration.
alter type public.post_visibility add value 'private';
