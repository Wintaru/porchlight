-- D18: a post with no summary shows its first sentence on the share card, the feed card
-- and the RSS item. `excerpt` is that sentence, kept by the database beside `body_md`,
-- so every door that writes a post (the editor, an agent, an anonymous author) gets it,
-- and a list reads one short column instead of every post's whole body.

-- The first sentence of the first paragraph of prose, as plain text, at most
-- `post_excerpt_max` characters. Headings, code, tables, rules and pictures are skipped;
-- a link keeps its words. Null when the body has no prose at all.
create function public.post_excerpt(p_body_md text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  -- The length a written summary may have: keep equal to SUMMARY_MAX_LENGTH in apps/web.
  v_max constant integer := 200;
  v_text text;
  v_block text;
  v_sentence text;
begin
  v_text := coalesce(p_body_md, '');
  v_text := replace(v_text, E'\r', '');
  v_text := regexp_replace(v_text, '```.*?```', E'\n\n', 'g');
  v_text := regexp_replace(v_text, '!\[[^\]]*\]\([^)]*\)', '', 'g');
  v_text := regexp_replace(v_text, '\[([^\]]*)\]\([^)]*\)', '\1', 'g');
  v_text := regexp_replace(v_text, '<(https?://[^>\s]+)>', '\1', 'g');
  v_text := regexp_replace(v_text, '</?[A-Za-z][^<>\n]*>', '', 'g');

  foreach v_block in array regexp_split_to_array(v_text, E'\n[ \t]*\n') loop
    v_block := btrim(v_block, E'\n');
    continue when v_block ~ '^(    |\t)'
      or btrim(v_block) ~ '^(#|\||---|\*\*\*|___|~~~|$)';
    -- Quote and list markers at the start of each line, then emphasis marks.
    v_block := regexp_replace(v_block, '(^|\n)[ \t]*(>[ \t]*)*([-*+][ \t]+|[0-9]+\.[ \t]+)?', '\1', 'g');
    v_block := regexp_replace(v_block, '[*_~`]', '', 'g');
    v_block := btrim(regexp_replace(v_block, '\s+', ' ', 'g'));
    continue when v_block = '';
    -- Only the first `v_max` characters are kept, so the search needs no more than a
    -- few times that. A lazy match's time grows with the square of its input.
    v_block := left(v_block, 4 * v_max);

    -- A stop followed by a lowercase word ("e.g. this") does not end the sentence.
    v_sentence := coalesce(
      (regexp_match(v_block, '^(.*?[.!?…]["''”’)]*)(\s+[^[:lower:]]|$)'))[1],
      v_block
    );
    if char_length(v_sentence) > v_max then
      v_sentence := regexp_replace(left(v_sentence, v_max - 1), '\s+\S*$', '') || '…';
    end if;
    return v_sentence;
  end loop;
  return null;
end;
$$;

comment on function public.post_excerpt (text) is
  'The first sentence of a post body as plain text (D18). Backs posts.excerpt.';

alter table public.posts
  add column excerpt text generated always as (public.post_excerpt(body_md)) stored;

-- The column grant is a list (voice_guide migration): a new column is closed until named.
grant select (excerpt) on public.posts to anon, authenticated;
