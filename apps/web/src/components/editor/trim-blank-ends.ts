// An empty paragraph at either end of the document is a cursor resting place, not
// content: it would serialize as blank lines and change `body_md` on every visit. Two
// empty paragraphs in a row serialize as `&nbsp;` (the serializer's way to keep a blank
// line), and the editor leaves one after a heading or list, so one Enter there made two.
// Blank lines inside the body are the author's spacing and stay.
const BLANK_LINE = /^(?:&nbsp;)?$/;

export function trimBlankEnds(markdown: string): string {
  const lines = markdown.split("\n");
  let start = 0;
  let end = lines.length;
  while (start < end && BLANK_LINE.test(lines[start] ?? "")) {
    start += 1;
  }
  while (end > start && BLANK_LINE.test(lines[end - 1] ?? "")) {
    end -= 1;
  }
  return lines.slice(start, end).join("\n");
}
