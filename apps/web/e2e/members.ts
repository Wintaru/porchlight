import { authUserId, deleteAuthUser, localValue } from "./auth-admin";
import { type SeedMember } from "./helpers";
import { rest } from "./service-rest";

// A member a test makes for itself and removes when it is done, for a flow that uses a
// member up (the erase test) or needs an address no other test asks for.
export interface TestMember extends SeedMember {
  readonly id: string;
}

// The seed's password, so `devSignIn` works for a made member too.
const TEST_PASSWORD = "porchlight";

// A trusted member with the given handle: the auth user (confirmed, with the seed's
// password) through the Auth admin API, then the profile and quota rows the first
// sign-in would otherwise make.
export async function createMember(handle: string): Promise<TestMember> {
  const email = `${handle}@porchlight.local`;
  const id = await authAdmin("POST", "", { email, email_confirm: true });
  // A separate call for the password: the local Auth (v2.197) drops the password of a
  // user created with `email_confirm`, and the sign-in is then refused.
  await authAdmin("PUT", `/${id}`, { password: TEST_PASSWORD });
  await rest("profiles", {
    method: "POST",
    body: JSON.stringify({
      id,
      handle,
      display_name: handle,
      role: "member",
      trust_level: "trusted",
    }),
  });
  await rest("quotas", {
    method: "POST",
    body: JSON.stringify({ profile_id: id, bytes_used: 0, files_count: 0 }),
  });
  return { id, email, handle };
}

// Removes a member a test made, whatever state the test left it in: pass the id when
// the auth user may be gone already (erasure deletes it), or only the address.
// `erase_account` first, the same call the erase flow makes: it takes the member's
// posts, comments, evidence and quota row, which would otherwise hold the profile row by
// foreign key, and it answers "already-erased" for a member the test erased. Then the
// profile row, then the auth user.
export async function removeMember(member: {
  readonly email: string;
  readonly id?: string;
}): Promise<void> {
  const id = member.id ?? (await authUserId(member.email));
  if (id !== undefined) {
    await rest("rpc/erase_account", {
      method: "POST",
      body: JSON.stringify({ p_profile_id: id }),
    });
    await rest(`profiles?id=eq.${id}`, { method: "DELETE" });
  }
  await deleteAuthUser(member.email);
}

// One call to the Auth admin users API with the service-role key. Answers the user's id.
async function authAdmin(
  method: "POST" | "PUT",
  path: string,
  body: Record<string, unknown>,
): Promise<string> {
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = localValue("SUPABASE_SERVICE_ROLE_KEY");
  const answer = await fetch(`${url}/auth/v1/admin/users${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!answer.ok) {
    throw new Error(`${method} admin/users${path}: ${String(answer.status)}`);
  }
  const { id } = (await answer.json()) as { id: string };
  return id;
}
