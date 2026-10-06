# MCP OAuth: connect claude.ai and other OAuth clients

A member can connect Claude on the web, on the desktop app or on a phone to Porchlight
as a **custom connector**. A connector cannot use a `plt_` token. It needs OAuth 2.1.
Supabase Auth is the OAuth server (D25). Porchlight adds three things:

- The consent page at `/oauth/consent`. The member reads which app is asking and picks
  what it may do.
- The metadata at `/.well-known/oauth-protected-resource`. An OAuth client reads it to
  find Supabase Auth.
- The link from an OAuth access token to the member's grant. The token then gets the
  same agent actor and the same scopes as a `plt_` token.

Personal `plt_` tokens for Claude Code work as before. Nothing in this guide changes
them.

## What you do not need it for

Claude Code with a `plt_` token needs none of this. See [../agents.md](../agents.md).

Local work needs no dashboard step. `supabase/config.toml` turns the OAuth server on in
the `[auth.oauth_server]` section, with dynamic client registration. If your local stack
ran before this change, restart it once so that Auth reads the new settings:

```sh
supabase stop
supabase start
```

The Playwright spec `apps/web/e2e/mcp-oauth.spec.ts` runs the whole flow against the
local stack: a scripted client registers, the member approves on the consent page, and
the client calls `/api/mcp` with its token.

## How a connection works

1. The client calls `/api/mcp` with no token. The door answers 401. Its
   `WWW-Authenticate` header names the metadata URL.
2. The metadata names Supabase Auth (`<NEXT_PUBLIC_SUPABASE_URL>/auth/v1`) as the
   authorization server.
3. The client reads Auth's own metadata and registers itself (dynamic client
   registration). Then it sends the member to Auth.
4. Auth sends the member to `<site URL>/oauth/consent`. A member who is not signed in
   signs in first and comes back to the page.
5. The member ticks the scopes and presses **Allow**. Porchlight stores the choice as a
   grant, then tells Auth to approve. Auth sends the member back to the client with a
   code.
6. The client trades the code for an access token (PKCE) and calls `/api/mcp` with it.
7. The door checks the token's header, key and signature, reads the member and the
   client from it, and loads the member's grant for that client. The scopes come from the grant, not from
   the token.

Supabase Auth has no custom scopes. That is why the member picks Porchlight's scopes on
the consent page and Porchlight stores them.

## Production

Do these in the Supabase dashboard of the hosted project.

1. Open Authentication, **OAuth Server**. Turn on the OAuth 2.1 server.
2. Set the authorization path to `/oauth/consent`. Auth adds it to the site URL, so the
   site URL in Authentication, **URL Configuration** must be the deployment's origin
   (deploy step 2 already sets it).
3. Turn on **Allow dynamic client registration**. claude.ai registers itself this way.
   Any client can register, but a client gets nothing until a member presses **Allow**
   on the consent page.
4. Check that `NEXT_PUBLIC_SUPABASE_URL` is the project URL that Auth uses as its
   issuer. The metadata names `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1`, and a client
   refuses the pair when that is not the `issuer` in Auth's metadata. With a custom
   domain for Supabase, the two can differ. Compare them:

   ```sh
   curl -s https://<your-site>/.well-known/oauth-protected-resource/api/mcp
   curl -s https://<project-ref>.supabase.co/auth/v1/.well-known/oauth-authorization-server
   ```

   The first answer's `authorization_servers` must hold the second answer's `issuer`.

5. Check that Auth signs tokens with an ES256 key. The door accepts only an ES256 token
   whose key id is in Auth's public key set (issue #88). It refuses every other token
   before it calls Auth, so a junk token costs nothing. Every hosted project with
   signing keys uses ES256. A project that still uses the legacy shared secret (HS256)
   must move to signing keys first: open Project Settings, **JWT Keys**. Check the key
   set:

   ```sh
   curl -s https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
   ```

   Each key must show `"alg":"ES256"`.

There is no new environment variable.

### Rotate the signing key

The door keeps Auth's public key set for 10 minutes. It does not see a new key before
then. In Project Settings, **JWT Keys**, make the new key the standby key first. Wait at
least 10 minutes, then rotate. Until the door fetches the key set again, a token signed
with a key that it has not seen gets 401.

## Connect claude.ai by hand after deploy

No automated test runs against the deployed site: claude.ai cannot reach a local stack.
Do this check once after the first deploy with the OAuth server on.

1. Sign in to the site as yourself. In **Settings**, section **Agents**, make sure
   agents are open to you.
2. In claude.ai, open Settings, **Connectors**, and add a custom connector. The URL is
   `https://<your-site>/api/mcp`.
3. Press **Connect**. The browser goes to the site's consent page. Check that it names
   the connector and that it sends you back to claude.ai.
4. Leave **Publish without you** and **Change your published posts** off. Press
   **Allow**.
5. In a new chat, ask Claude to call `get_me`. The answer must show your handle and the
   scopes `posts:draft` only.
6. Ask Claude to publish one of your drafts. The tool must refuse ("Not allowed").
7. In **Settings**, section **Agents**, find the connector, marked "(connected app)".
   Press **Revoke**. Ask Claude to call `get_me` again. It must fail.

## Change what a connected app may do

Revoke it in **Settings**, section **Agents**, and connect it again. Supabase Auth
approves a client again without asking when the member consented before, so the consent
page shows only on a first connection. A revoke in settings also withdraws the consent
at Auth, so the next connection shows the page again.

A second press on **Allow** replaces the grant from the first press. The last press
wins, and both presses succeed (issue #88).

## What the token can do outside the door

The access token is a Supabase session token for the member. With the project's anon
key, a client could also read what the member's own browser session reads through
Supabase's API. The browser roles can only read (SPEC.md §3, D2): public posts and
profiles, and the member's own drafts, notifications and uploads. Every write goes
through the server, and the server honors an OAuth token only at `/api/mcp`, with the
member's grant.
