# A private section for an organization (idea)

Logged 2026-10-09. Not decided. Open question **D35** in [WAYFINDER.md](WAYFINDER.md).

## The idea

The blog stays public. But one part of it belongs to an organization (a company, a club, a school). Only members of that organization can read the posts in that part. A member proves that they belong through the organization's own sign-in (SSO) or a similar check.

## Earlier decisions that this reopens

This idea goes against three settled decisions. Each one must be reopened on purpose, not by accident:

- **D18** rejected a members-only tier: "crawlers cannot preview it, splits SEO".
- **D27** rejected members-only and followers-only tiers "for now": "a second audience to keep out of every surface".
- **D20** rejected communities as a second object (like subreddits) "for now". An organization is a second object of that kind.

D27's reason is the largest cost. Each surface that hides a private post today (feeds, tag pages, search, RSS, sitemap, notices, email, the agent door, the preview card) must also hide an organization post from everyone outside the organization. RLS at the database must enforce it, the same as for private posts.

## Points to decide

1. **What an organization is.** A new `orgs` table with a name and a slug, and an `org_members` table. A post gets a fourth visibility, `org`, and the id of the organization. Can one site have more than one organization? Can a member be in more than one?
2. **How a person proves membership.** From simple to complex:
   - **Email domain.** "Anyone who signs in with an `@acme.com` address joins Acme." Sign-in (D23) already proves that a person owns the address. This needs no SSO and no vendor key. Recommendation: start here.
   - **Invite by an organization admin.** The same as the D20 invite links, but for one organization.
   - **Real SSO (SAML or OIDC).** Supabase Auth supports SAML SSO on paid plans, and each organization must connect its own identity provider. It needs a fake mode for local work (D19) and a `docs/setup/` guide. Keep it for a later step, when an organization asks for it.
3. **What happens when a person leaves.** An email-domain member who loses the address cannot sign in with it again, but an open session stays. Do memberships expire, or must an organization admin remove the person?
4. **Who moderates.** The scan of every upload stays, with no exception (D17). But who reads the reports and the queue for organization posts: site staff, or moderators that the organization names? D27 kept staff out of private posts. An organization post has many readers, so it cannot skip moderation.
5. **The URL and the preview.** Does the section live at `/o/acme`? A shared link must not leak the title or the cover to a person outside the organization. The preview card shows only "A post for Acme members". The page returns 404 to a person outside it, the same as a private post.
6. **Search engines and RSS.** Organization posts stay out of the sitemap, search, and the public feeds (`noindex`). Do members get their own feed? A plain RSS reader cannot sign in, so that feed needs a secret token in its URL.
7. **Export, erasure and site moves.** Member export (section 10) includes organization posts. A site export (D29) must carry the organizations and their members.

## A smaller first step

A smaller version gives most of the value: one visibility, `members`, that any signed-in member of the site can read. The site's `sign_up` setting (`invite` or `closed`, from D20) then controls who is a member. That needs no new object and no SSO. It still reopens D18 and D27, but not D20.
