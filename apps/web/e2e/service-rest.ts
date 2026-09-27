import { localValue } from "./auth-admin";

interface RestInit {
  readonly method: string;
  readonly body?: string;
  readonly prefer?: string;
}

// One PostgREST call with the local stack's service-role key, for the setup and cleanup
// steps no page can do. Throws on any status that is not 2xx.
export async function rest(path: string, init: RestInit): Promise<Response> {
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = localValue("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method,
    ...(init.body === undefined ? {} : { body: init.body }),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.prefer === undefined ? {} : { Prefer: init.prefer }),
    },
  });
  if (!response.ok) {
    throw new Error(`${init.method} ${path}: ${String(response.status)}`);
  }
  return response;
}
