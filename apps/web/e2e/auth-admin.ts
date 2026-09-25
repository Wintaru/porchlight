import { readFileSync } from "node:fs";

// Supabase Auth's admin API on the local stack, for the one cleanup a page cannot do:
// removing an auth user that a test made. The local stack's fixed keys come from
// .env.example at the repo root, the same source packages/db/test uses.
const ENV_EXAMPLE = new URL("../../../.env.example", import.meta.url);

function localValue(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv;
  }
  const line = readFileSync(ENV_EXAMPLE, "utf8")
    .split("\n")
    .find((candidate) => candidate.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim();
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set in the environment or in .env.example`);
  }
  return value;
}

// Deletes the auth user with this address, if there is one. Only for addresses with no
// profile: a profile row refers to its auth user.
export async function deleteAuthUser(email: string): Promise<void> {
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = localValue("SUPABASE_SERVICE_ROLE_KEY");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const listed = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
  const { users } = (await listed.json()) as {
    users: readonly { id: string; email?: string }[];
  };
  const user = users.find((candidate) => candidate.email === email);
  if (user === undefined) {
    return;
  }
  const deleted = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers,
  });
  if (!deleted.ok) {
    throw new Error(
      `could not delete the auth user for ${email}: ${String(deleted.status)}`,
    );
  }
}
