// The public origin of this deployment (.env.example). OAuth redirects go back here, so
// it is read from configuration, never from the request's Host header. A production
// build must name it: the localhost default would send Google's callback to the wrong
// host and show up as "sign-in loops to home".
const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_URL = readSiteUrl();

function readSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured !== undefined && configured !== "") {
    return configured.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set. See .env.example.");
  }
  return LOCAL_SITE_URL;
}
