import { DigestsSentResponse, SendDigestsRequest } from "@porchlight/core";

import { carriesCronSecret } from "@/lib/cron-secret";
import { getDependencyContainer } from "@/lib/dependency-container";
import { getEmailSite } from "@/lib/email-site";

// The email sweep (#22, D14). A scheduler calls it every few minutes: pg_cron in
// Supabase, Vercel Cron, or a plain cron job (docs/deploy.md). Each call sends every
// digest and queue email that is due. GET for Vercel Cron, POST for everything else.
async function sweep(request: Request): Promise<Response> {
  if (!carriesCronSecret(request)) {
    return new Response("Not found", { status: 404 });
  }
  const response = await getDependencyContainer().notificationManager.execute(
    new SendDigestsRequest(await getEmailSite()),
  );
  if (!(response instanceof DigestsSentResponse)) {
    console.error(`email sweep failed [${response.correlationId}]`, response);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  if (response.failed > 0) {
    console.error(
      `email sweep: ${String(response.failed)} put back [${response.correlationId}]: ${response.reason ?? ""}`,
    );
  }
  return Response.json({ sent: response.sent, failed: response.failed });
}

// A run paces its calls to Resend and retries a refused one for a few seconds (#86), so
// it can take longer than a plain page. Sixty seconds is allowed on every Vercel plan and
// matches the pg_net timeout in docs/deploy.md step 10.
export const maxDuration = 60;

export const GET = sweep;
export const POST = sweep;
