create or replace function public.get_word_level_totals()
returns table (
  level text,
  word_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    w.level,
    count(*) as word_count
  from public.words w
  where w.level in ('N5', 'N4', 'N3', 'N2', 'N1')
  group by w.level
  order by case w.level
    when 'N5' then 1
    when 'N4' then 2
    when 'N3' then 3
    when 'N2' then 4
    when 'N1' then 5
    else 6
  end;
$$;

revoke execute on function public.get_word_level_totals()
from public, anon;

grant execute on function public.get_word_level_totals()
to authenticated;
