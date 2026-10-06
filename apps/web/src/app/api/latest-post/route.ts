import { createCookielessAuthClient } from "@/auth/session-client";
import { loadNewestPublishedAt } from "@/read-model/feed";

// The home page's poll (D33): when the newest public post went up. The answer is the
// same for every reader, so it reads no cookie, the proxy skips this path, and the CDN
// keeps it for 30 seconds. However many readers poll, the database sees a few reads a
// minute.
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=30";

export async function GET(): Promise<Response> {
  const publishedAt = await loadNewestPublishedAt(createCookielessAuthClient());
  return Response.json({ publishedAt }, { headers: { "Cache-Control": CACHE_CONTROL } });
}
