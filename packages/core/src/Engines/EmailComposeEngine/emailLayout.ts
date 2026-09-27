import { EMAIL_PATHS, type EmailSite } from "../../Common/EmailSite";
import { escapeHtml } from "../../Utilities/email/escapeHtml";

// One paragraph of an email: plain text, and a link when it has one.
export interface EmailBlock {
  readonly text: string;
  readonly href?: string;
}

// The frame every Porchlight email shares: the blocks, then a footer that says why the
// reader gets this mail and how to stop it. Plain HTML with inline styles only, since
// mail clients drop style sheets.
export function renderEmail(
  blocks: readonly EmailBlock[],
  footer: readonly EmailBlock[],
): { readonly text: string; readonly html: string } {
  const textOf = (block: EmailBlock) =>
    block.href === undefined ? block.text : `${block.text}\n${block.href}`;
  const htmlOf = (block: EmailBlock, style: string) => {
    const text = escapeHtml(block.text);
    const body =
      block.href === undefined
        ? text
        : `<a href="${escapeHtml(block.href)}" style="color:#B4530A">${text}</a>`;
    return `<p style="${style}">${body}</p>`;
  };
  const text = [...blocks.map(textOf), "--", ...footer.map(textOf)].join("\n\n");
  const html = [
    '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#221F1C;max-width:560px">',
    ...blocks.map((block) => htmlOf(block, "margin:0 0 16px")),
    '<hr style="border:none;border-top:1px solid #d9d2c7;margin:24px 0">',
    ...footer.map((block) =>
      htmlOf(block, "margin:0 0 8px;font-size:13px;color:#75695C"),
    ),
    "</div>",
  ].join("\n");
  return { text, html };
}

export function unsubscribeLinks(
  site: EmailSite,
  token: string,
): { readonly page: string; readonly oneClick: string } {
  const query = `?token=${encodeURIComponent(token)}`;
  return {
    page: `${site.url}${EMAIL_PATHS.unsubscribePage}${query}`,
    oneClick: `${site.url}${EMAIL_PATHS.unsubscribeOneClick}${query}`,
  };
}
