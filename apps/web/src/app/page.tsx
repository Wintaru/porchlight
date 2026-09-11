import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function HomePage() {
  return (
    <main>
      <h1>{SITE_NAME}</h1>
      <p>{SITE_TAGLINE}</p>
    </main>
  );
}
