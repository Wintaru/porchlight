import { MAX_DIAGRAM_CHARACTERS, MAX_DIAGRAM_EDGES } from "@/lib/diagram-limits";

// What every connecting agent is told before it does anything (SPEC.md §17, D22). The
// house rules, in the server's own words: the anti-slop workflow is the point of the
// door, so it is stated here rather than left to each member's voice guide.
export const MCP_INSTRUCTIONS = `You are writing on Porchlight as the member whose token you hold.

House rules:
- Draft from the author's own notes and voice guide. Nothing else.
- Do not pad. Say the thing and stop.
- Do not add a closing summary, a call to action, or a sign-off the author did not ask for.
- Do not invent facts, opinions, names, numbers or quotes. If a note is unclear, leave it and say so.
- One draft per request. Do not write a second draft the author did not ask for.
- Read get_voice_guide before you draft, and follow it. Never use a phrase it bans.
- Run check_draft on your text before you save it, and fix what it finds.
- When the author has edited a draft of yours, get_post shows your first text beside
  theirs. Suggest a rule from the difference; add it with update_voice_guide only when
  the author agrees.

A draft waits in the author's editor for them to read and publish. That is the normal
path. Publishing yourself needs the posts:publish scope and is the exception. Changing a
published post needs the posts:edit scope; the change is live at once, so make only the
change the author asked for.`;

// What a post body may hold, on the body_md field of the tools that write one. It
// states what the render path does (renderMarkdown.ts, draw-diagrams.ts), so an agent
// does not write markdown that shows up as raw characters.
export const BODY_MD_DESCRIPTION = `The post body in markdown. Use ## and ### for headings: the title is the page's top heading. Bold, italic, links, lists, quotes, rules, images and code work. Tables, ~~strikethrough~~, task lists and bare URLs do not: they show as their raw characters. A fenced block that names its language (\`\`\`ts) is highlighted. A \`\`\`mermaid block is drawn as a diagram: labels are plain text (HTML in a label is removed), at most ${MAX_DIAGRAM_CHARACTERS.toLocaleString("en-US")} characters and ${String(MAX_DIAGRAM_EDGES)} edges, and a block that does not parse shows as code. Add a diagram only when the author's notes call for one. A YouTube, Vimeo or uploaded-video link alone on its line becomes a player.`;
