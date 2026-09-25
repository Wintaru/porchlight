-- Issue #67: the email sign-in links need the Email provider on, and with it on anyone
-- with the public anon key can sign up an address with a password. Without this, a
-- stranger could register someone else's address with a password first; the owner's
-- first sign-in link would confirm the account and the stranger's password would still
-- work. For `PORCHLIGHT_ADMIN_EMAIL`, that is the admin account.
--
-- Porchlight has no passwords (SPEC.md §4, D23), so a password set before an address
-- was confirmed is dropped when it is confirmed. Only the address's owner can confirm
-- it. Rows written already confirmed (the local seed, `auth.admin.createUser` with
-- `email_confirm`) keep theirs, so the dev sign-in still works.
create function public.clear_password_on_email_confirm()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    new.encrypted_password := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.clear_password_on_email_confirm () from public, anon, authenticated;

create trigger clear_password_on_email_confirm
before update on auth.users
for each row
execute function public.clear_password_on_email_confirm();
