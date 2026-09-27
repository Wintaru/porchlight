import { UnsubscribedResponse, UnsubscribeRequest } from "@porchlight/core";
import { NextResponse } from "next/server";

import { getDependencyContainer } from "@/lib/dependency-container";

function tokenOf(request: Request): string {
  return new URL(request.url).searchParams.get("token") ?? "";
}

// The List-Unsubscribe target in every email (#22). A mail client's own Unsubscribe
// button POSTs here once, with no page and no sign-in (RFC 8058). An unknown token
// answers the same as a known one, so the link tells a stranger nothing.
export async function POST(request: Request): Promise<Response> {
  const response = await getDependencyContainer().notificationManager.execute(
    new UnsubscribeRequest(tokenOf(request)),
  );
  if (!(response instanceof UnsubscribedResponse)) {
    console.error(`unsubscribe failed [${response.correlationId}]`, response);
    return new Response("Try again later.", { status: 503 });
  }
  return new Response("Unsubscribed.", { status: 200 });
}

// A person who opens the header's link in a browser gets the page that asks first.
export function GET(request: Request): Response {
  const url = new URL("/email/unsubscribe", request.url);
  url.searchParams.set("token", tokenOf(request));
  return NextResponse.redirect(url, 303);
}
