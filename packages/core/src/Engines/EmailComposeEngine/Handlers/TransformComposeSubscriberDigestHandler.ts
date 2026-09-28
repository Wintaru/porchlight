import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import type { EmailSite } from "../../../Common/EmailSite";
import type { IHandler } from "../../../Common/IHandler";
import { type EmailBlock, renderEmail, unsubscribeLinks } from "../emailLayout";
import type { ComposeSubscriberDigestRequest } from "../Requests/ComposeSubscriberDigestRequest";
import { EmailComposedResponse } from "../Responses/EmailComposedResponse";

// The same two routes the site's RSS items use: an unclaimed anonymous post has no
// author page, so its only address is /p/slug.
function postUrl(site: EmailSite, post: AnnouncedPost): string {
  return post.authorHandle === null
    ? `${site.url}/p/${post.slug}`
    : `${site.url}/@${post.authorHandle}/${post.slug}`;
}

// The handle only, never the display name (#84): a member can put spam in their name.
function authorLabelOf(post: AnnouncedPost | undefined): string | null {
  const handle = post?.authorHandle ?? null;
  return handle === null ? null : `@${handle}`;
}

// Each post: its title as the link, then its summary when it has one.
export class TransformComposeSubscriberDigestHandler implements IHandler<
  ComposeSubscriberDigestRequest,
  EmailComposedResponse
> {
  handle(request: ComposeSubscriberDigestRequest): Promise<EmailComposedResponse> {
    const { claim, posts, more, site, correlationId } = request;
    const author = claim.authorId === null ? null : authorLabelOf(posts[0]);
    const subject =
      author === null ? `New on ${site.name}` : `New from ${author} on ${site.name}`;
    const blocks: EmailBlock[] = posts.flatMap((post) => [
      { text: post.title, href: postUrl(site, post) },
      ...(post.summary === null || post.summary === "" ? [] : [{ text: post.summary }]),
    ]);
    if (more) {
      const firstHandle = posts[0]?.authorHandle ?? null;
      blocks.push({
        text: `More new posts on ${site.name}`,
        href:
          claim.authorId === null || firstHandle === null
            ? site.url
            : `${site.url}/@${firstHandle}`,
      });
    }
    const links = unsubscribeLinks(site, claim.unsubscribeToken);
    const scope = author === null ? site.name : `${author} on ${site.name}`;
    const { text, html } = renderEmail(blocks, [
      { text: `You get this email because you subscribed to ${scope}.` },
      { text: "Unsubscribe", href: links.page },
    ]);
    return Promise.resolve(
      new EmailComposedResponse(correlationId, {
        to: claim.email,
        subject,
        text,
        html,
        unsubscribeUrl: links.oneClick,
      }),
    );
  }
}
