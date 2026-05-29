create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('N1', 'N2', 'N3', 'N4', 'N5')),
  created_at timestamptz not null default now()
);

create table if not exists public.study_session_words (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  unique (session_id, word_id)
);

create index if not exists study_sessions_user_created_idx
  on public.study_sessions(user_id, created_at desc);

create index if not exists study_session_words_session_idx
  on public.study_session_words(session_id);

create index if not exists study_session_words_word_idx
  on public.study_session_words(word_id);

alter table public.study_sessions enable row level security;
alter table public.study_session_words enable row level security;

drop policy if exists "study_sessions_own_select" on public.study_sessions;
drop policy if exists "study_session_words_own_select" on public.study_session_words;

create policy "study_sessions_own_select"
on public.study_sessions
for select
to authenticated
using (user_id = auth.uid());

create policy "study_session_words_own_select"
on public.study_session_words
for select
to authenticated
using (
  exists (
    select 1
    from public.study_sessions s
    where s.id = study_session_words.session_id
      and s.user_id = auth.uid()
  )
);

grant select on public.study_sessions to authenticated;
grant select on public.study_session_words to authenticated;

create or replace function public.list_study_sessions()
returns table (
  session_id uuid,
  level text,
  word_count bigint,
  created_at timestamptz,
  is_recent boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.level,
    count(sw.id) as word_count,
    s.created_at,
    s.created_at >= now() - interval '24 hours' as is_recent
  from public.study_sessions s
  left join public.study_session_words sw on sw.session_id = s.id
  where s.user_id = auth.uid()
  group by s.id
  order by s.created_at desc
  limit 100;
$$;

create or replace function public.get_study_session_words(p_session_id uuid)
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
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    sw.id,
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
    s.created_at
  from public.study_sessions s
  join public.study_session_words sw on sw.session_id = s.id
  join public.words w on w.id = sw.word_id
  where s.id = p_session_id
    and s.user_id = auth.uid()
  order by sw.created_at asc;
$$;

create or replace function public.get_recent_study_session_words(
  p_hours integer default 24
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
language sql
security definer
set search_path = public
as $$
  with recent_session as (
    select s.id
    from public.study_sessions s
    where s.user_id = auth.uid()
      and s.created_at >= now() - make_interval(hours => least(greatest(p_hours, 1), 168))
    order by s.created_at desc
    limit 1
  )
  select session_words.*
  from recent_session rs
  join lateral public.get_study_session_words(rs.id) as session_words on true;
$$;

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
  returning id into v_session_id;

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
    returning id, word_id
  )
  select
    v_session_id,
    iw.id,
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
  join selected_words w on w.id = iw.word_id;
end;
$$;

revoke execute on function public.list_study_sessions() from public, anon;
revoke execute on function public.get_study_session_words(uuid) from public, anon;
revoke execute on function public.get_recent_study_session_words(integer) from public, anon;
revoke execute on function public.create_new_study_session(text, integer) from public, anon;

grant execute on function public.list_study_sessions() to authenticated;
grant execute on function public.get_study_session_words(uuid) to authenticated;
grant execute on function public.get_recent_study_session_words(integer) to authenticated;
grant execute on function public.create_new_study_session(text, integer) to authenticated;
