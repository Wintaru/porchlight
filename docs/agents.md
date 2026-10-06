# Agents: writing on Porchlight with your own assistant

Porchlight has a door your own writing assistant can use. You mint a token, give it to
your agent, and the agent drafts posts as you. The drafts wait in your editor. You read
them and publish. That is the normal path, and it is the point of the design: the
assistant helps you write, and a person still decides what the site says.

Porchlight is the MCP **server** here. Your agent, for example Claude Code, is the
client and runs on your own subscription. Porchlight never calls a model vendor and
needs no API key for this.

## What you need

An account on the site, and a site whose admin has left agents on. Nothing else. There
is no production step for this feature and no key to buy: tokens are minted in the app.

## Mint a token

1. Open **Settings**, section **Agents**.
2. Give the token a name you will recognise later, such as "Laptop".
3. Pick the scopes. **Write drafts** is always on and is the floor. **Publish without
   you** is the one to think about: with it, your agent can put a post on the site
   without you reading it first. Leave it off unless you want that. **Change your
   published posts** is the same kind of choice: with it, your agent can change a post
   that readers can already see, and the change is live at once.
4. Pick an expiry, or "Never".
5. Press **Mint token**.

The token appears **once**. Copy it now. Porchlight stores only a hash of it, so nobody,
including the site's admin, can show it to you again. If you lose it, revoke it and mint
another.

## Connect Claude Code

The settings page shows the exact line, with your token already in it. It looks like
this:

```sh
claude mcp add --transport http porchlight https://your-site.example/api/mcp \
  --header "Authorization: Bearer plt_your_token_here"
```

Run it in a terminal. Claude Code then lists Porchlight's tools and can write for you.

## Connect Claude on the web, desktop or phone

Claude's apps connect through a custom connector, which signs in with OAuth instead of
a token. The site's admin must turn this on first ([setup/mcp-oauth.md](setup/mcp-oauth.md)).

1. In Claude, open Settings, **Connectors**, and add a custom connector with the URL
   `https://your-site.example/api/mcp`.
2. Press **Connect**. Claude sends you to Porchlight. Sign in if you are asked to.
3. The page **Connect an app** names the app and where it sends you back. Tick what it
   may do, the same choices as for a token, and press **Allow**. **Deny** sends it away
   with nothing.

The app then shows in **Settings**, section **Agents**, marked "(connected app)". Revoke
it there to disconnect it at once. To change what it may do, revoke it and connect it
again.

## The notes-to-draft workflow

The way this is meant to be used:

1. You keep notes — a paragraph, a list of points, a half-formed argument.
2. You ask your agent to draft a post from those notes.
3. The agent calls `create_draft`. The draft lands in your editor at `/write`, marked
   "agent draft, not yet reviewed".
4. You open it, read it, change what you want, and publish. Your edit marks the post
   reviewed.
5. Later, the agent can read the post again with `get_post`. It sees its own first text
   beside what you published, and it can suggest a rule for your voice guide from the
   difference.

## Your voice guide

Open **Settings**, section **Agents**, and write the rules you would give a person who
writes for you: sentence length, words you never use, how you open and how you stop.
The agent reads the guide with `get_voice_guide` before it drafts.

With the guide, the agent also receives two things you do not write:

- A list of phrases that every guide bans, such as "delve" and "in conclusion". You
  cannot remove the default ones. To add your own, put a heading with the word
  "banned" in your guide, and list one phrase on each line under it:

  ```markdown
  ## Banned phrases

  - circle back
  - super excited
  ```

  A phrase matches at the start of a longer word too, so "delve" also finds "delves"
  and "delved". This works for short phrases as well: "ai" finds "aim" and "aisle".
  Keep your own phrases long enough to name only what you mean. A last paragraph that
  opens with "In conclusion" gives one warning, for the closing summary.
- Your five latest published posts **that you wrote in the editor**, as samples of your
  writing. A post an agent drafted never counts, even after you edit it, so the agent
  does not learn from itself.

The settings page shows both under "What your agent also receives". An agent can change
your guide only with the **Change your voice guide** scope, and the house rules tell it
to add a rule only when you agree. Each save, by you or by the agent, keeps the text
it replaced: open "Earlier versions" under the guide to see what changed and copy a
rule back. The site keeps the last 50. The guide and its earlier versions are part of
your export, and erasing your account deletes them.

The server tells every connecting agent the house rules before it writes: draft from
your notes and your voice guide only, do not pad, do not add a closing summary, do not
invent facts or opinions, one draft per request, read the voice guide first, and run
`check_draft` before it saves.

## The tools

| Tool | What it does |
| ---- | ------------ |
| `get_me` | Who the agent is writing as: your handle, your trust level, the token's scopes. |
| `list_posts` | Your own posts, newest first, filtered by status: the 50 newest unless it asks for up to 200, and it says when there are more. Titles and status, not bodies — use `get_post` for one. |
| `get_voice_guide` | Your rules, the default banned phrases, and your latest hand-written posts as samples. |
| `update_voice_guide` | Replaces your rules with new text. Needs the **Change your voice guide** scope. |
| `check_draft` | Checks a draft's text for your banned phrases and a few signs of machine writing. It gives warnings only. The editor has the same check as a **Check** button. |
| `get_post` | One of your own posts, by id or slug. For a post the agent drafted, it also returns the agent's first text. |
| `create_draft` | Starts a draft. Never publishes. |
| `update_draft` | Changes a draft of yours. With the **Change your published posts** scope, it also changes a published post of yours, but never who can read it. An upload it takes out of the post is deleted, unless another post or a comment shows it. |
| `delete_draft` | Deletes a draft of yours. |
| `publish_post` | Publishes one of your drafts. Needs the **Publish without you** scope. |
| `request_upload` | Gets a one-time address to upload a file, and the `curl` line that sends it. Needs the **Upload images and files** scope. |
| `finalize_upload` | Checks and scans the uploaded file. A clear image comes back with its URL and the markdown for a draft. |
| `get_media` | Where one of your uploads stands: ready, held for review, or not published yet. |

## Uploading images and files

With the **Upload images and files** scope, your agent can add a picture or a file to
a draft:

1. The agent calls `request_upload` with the file name and size. It gets a one-time
   address and a `curl` line.
2. The agent runs the `curl` line from its own shell. The file goes straight to
   storage. It never passes through the conversation or the model.
3. The agent calls `finalize_upload`. Porchlight checks that the file is what its name
   says, and scans it the same way as a file you upload in the editor.
4. A clear image comes back with a URL and the markdown to put in the draft.

The upload is yours: it counts against your storage quota and shows in the editor's
file list. A file the scan holds comes back as "held for review" until a moderator
looks at it. A file the scan refuses comes back as "Refused." with no reason, and it
never appears anywhere.

## What an agent cannot do

An agent carries your profile, but it is not you. It may only touch **your own drafts**,
and your own published posts when you give it the **Change your published posts** scope.
It cannot delete a post that is already published, change who can read one, comment, react, report,
moderate anything, change your profile, export or erase your account, or mint or revoke
tokens. Those need a person signed in.

Your trust level carries through unchanged. If your posts wait for a moderator, so do
your agent's.

## Limits

Each token may create **5 drafts** and **publish 2 posts** a day. Changes to a
published post have no daily cap. Each one is kept in the post's history, and the site
records which token made it. `get_me` reports the
site's real numbers. Over the limit, the tool answers with the cap and the time it
resets, so your agent can tell you instead of retrying.

The site's admin sets both caps on `/admin`, in the Access section. A cap of 0 turns
that action off for every token.

## What readers see

A post your agent drafted says so under it, unless the site's admin turned that off
(`/admin`, "Agent disclosure"). The line reads "Drafted with an assistant, edited by
@you" once you have saved or published the post yourself, and "Posted by an assistant
for @you" when your agent published it and you never opened it. Until you save it,
the draft carries an "agent draft, not yet reviewed" badge in your drafts list and in
the moderation queue, and the editor reminds you to read it before you publish.

When your agent changes a post that is already published, the post reads "Last changed
by an assistant for @you", and your posts list shows "changed by an agent, not yet
reviewed". Both go away when you open the post and save it. The post's history keeps
the words it replaced.

## Revoke a token

Settings, section Agents, **Revoke** next to the token. It stops working at once: the
next call from that token is refused at the door. Revoking is final — mint a new token
rather than trying to undo it.

## Running it locally

Everything above works against a local stack with no keys (`README.md` has the setup).
Mint a token at http://localhost:3000/settings after signing in at
`/auth/dev-sign-in`, and point your agent at `http://localhost:3000/api/mcp`.

`AGENT_TOKEN_PROVIDER=fake` in `.env.example` swaps the token store for an in-memory
one, for tests. A production build refuses it (D19).

To see the other upload answers locally, set the fake scanners in `.env.local` and
restart the dev server:

- `IMAGE_CLASSIFIER_FAKE_RESULT=flagged`: every image comes back "held for review".
- `HASH_MATCH_FAKE_RESULT=match`: every image comes back "Refused.". The file is locked,
  and a locked file cannot be deleted before its retention date, so run
  `supabase db reset` afterwards.
