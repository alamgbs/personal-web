begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'backlog_item_dependencies'
      and column_name = 'depends_on_item_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'backlog_item_dependencies'
      and column_name = 'depends_on_backlog_item_id'
  ) then
    alter table public.backlog_item_dependencies
      rename column depends_on_item_id to depends_on_backlog_item_id;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'backlog_item_dependencies'
      and column_name = 'dependency_kind'
  ) then
    alter table public.backlog_item_dependencies
      add column dependency_kind text not null default 'finish_to_start';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_item_dependencies_pair_key'
  ) then
    alter table public.backlog_item_dependencies
      add constraint backlog_item_dependencies_pair_key
      unique (backlog_item_id, depends_on_backlog_item_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_item_dependencies_kind_check'
  ) then
    alter table public.backlog_item_dependencies
      add constraint backlog_item_dependencies_kind_check
      check (dependency_kind = 'finish_to_start');
  end if;
end $$;

create index if not exists idx_backlog_item_dependencies_depends_on
  on public.backlog_item_dependencies (depends_on_backlog_item_id);

alter table public.backlog_items
  alter column required_skills set default '{}'::text[],
  alter column execution_mode set default 'build',
  alter column stage set default 'execution';

update public.backlog_items bi
set execution_mode = case
  when coalesce(nullif(trim(bi.execution_mode), ''), '') in ('', 'manual') then
    case
      when coalesce(nullif(trim(bi.stage), ''), 'execution') in ('prd', 'planning', 'discovery') then 'planning'
      when coalesce(nullif(trim(bi.stage), ''), 'execution') in ('review', 'security') then 'review'
      else 'build'
    end
  else bi.execution_mode
end,
stage = case
  when coalesce(nullif(trim(bi.stage), ''), '') in ('', 'delivery') then 'execution'
  when bi.stage = 'discovery' then 'planning'
  else bi.stage
end,
required_skills = coalesce(bi.required_skills, '{}'::text[])
where bi.execution_mode is null
   or trim(bi.execution_mode) = ''
   or bi.execution_mode = 'manual'
   or bi.stage is null
   or trim(bi.stage) = ''
   or bi.stage in ('delivery', 'discovery')
   or bi.required_skills is null;

insert into public.backlog_item_dependencies (backlog_item_id, depends_on_backlog_item_id)
select child.id, parent.id
from public.backlog_items child
join public.backlog_items parent
  on parent.project_id = child.project_id
 and parent.sprint_number is not distinct from child.sprint_number
where child.title like 'Sprint % · Frontend MVP · %'
  and parent.title = replace(child.title, 'Frontend MVP', 'Product breakdown')
on conflict do nothing;

insert into public.backlog_item_dependencies (backlog_item_id, depends_on_backlog_item_id)
select child.id, parent.id
from public.backlog_items child
join public.backlog_items parent
  on parent.project_id = child.project_id
 and parent.sprint_number is not distinct from child.sprint_number
where child.title like 'Sprint % · Backend core · %'
  and parent.title = replace(child.title, 'Backend core', 'Product breakdown')
on conflict do nothing;

insert into public.backlog_item_dependencies (backlog_item_id, depends_on_backlog_item_id)
select child.id, parent.id
from public.backlog_items child
join public.backlog_items parent
  on parent.project_id = child.project_id
 and parent.sprint_number is not distinct from child.sprint_number
where child.title like 'Sprint % · Security gate · %'
  and parent.title in (
    replace(child.title, 'Security gate', 'Frontend MVP'),
    replace(child.title, 'Security gate', 'Backend core')
  )
on conflict do nothing;

commit;
