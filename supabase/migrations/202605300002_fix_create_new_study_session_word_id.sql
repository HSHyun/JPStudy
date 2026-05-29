create or replace function public.create_new_study_session(
  p_level text,
  p_limit integer default 20
)
returns table (
  session_id uuid,
  session_word_id uuid,
  word_id uuid,
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
  session_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_level not in ('N1', 'N2', 'N3', 'N4', 'N5') then
    raise exception 'Invalid JLPT level: %', p_level;
  end if;

  if not exists (
    select 1
    from public.words w
    where w.level = p_level
      and not exists (
        select 1
        from public.study_sessions s
        join public.study_session_words sw on sw.session_id = s.id
        where s.user_id = v_user_id
          and sw.word_id = w.id
      )
  ) then
    return;
  end if;

  insert into public.study_sessions(user_id, level)
  values (v_user_id, p_level)
  returning study_sessions.id into v_session_id;

  return query
  with selected_words as (
    select w.*
    from public.words w
    where w.level = p_level
      and not exists (
        select 1
        from public.study_sessions s
        join public.study_session_words sw on sw.session_id = s.id
        where s.user_id = v_user_id
          and sw.word_id = w.id
      )
    order by random()
    limit least(greatest(p_limit, 1), 100)
  ),
  inserted_words as (
    insert into public.study_session_words(session_id, word_id)
    select v_session_id, selected_words.id
    from selected_words
    returning
      study_session_words.id as session_word_id,
      study_session_words.word_id as inserted_word_id
  )
  select
    v_session_id,
    iw.session_word_id,
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
    now()
  from inserted_words iw
  join selected_words w on w.id = iw.inserted_word_id;
end;
$$;

revoke execute on function public.create_new_study_session(text, integer)
from public, anon;

grant execute on function public.create_new_study_session(text, integer)
to authenticated;
