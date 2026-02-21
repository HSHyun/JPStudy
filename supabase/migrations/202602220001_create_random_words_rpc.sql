create or replace function public.get_random_words(
  p_level text,
  p_limit integer default 5
)
returns table (
  id uuid,
  section text,
  entry_type text,
  jp text,
  kana text,
  meaning text,
  example_jp text,
  example_ko text,
  extra_json jsonb,
  raw_ocr text,
  level text,
  created_at timestamptz
)
language sql
stable
as $$
  select
    w.id,
    w.section,
    w.entry_type,
    w.jp,
    w.kana,
    w.meaning,
    w.example_jp,
    w.example_ko,
    w.extra_json,
    w.raw_ocr,
    w.level,
    w.created_at
  from public.words as w
  where w.level = p_level
  order by random()
  limit greatest(p_limit, 1);
$$;
