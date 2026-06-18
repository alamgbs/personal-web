begin;

create table if not exists public.backlog_item_dependencies (
  id uuid primary key default extensions.uuid_generate_v4(),
  backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  depends_on_backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  dependency_kind text not null default 'finish_to_start',
  created_at timestamptz not null default now(),
  unique (backlog_item_id, depends_on_backlog_item_id),
  constraint backlog_item_dependencies_not_self
    check (backlog_item_id <> depends_on_backlog_item_id),
  constraint backlog_item_dependencies_kind_check
    check (dependency_kind = 'finish_to_start')
);

create index if not exists idx_backlog_item_dependencies_backlog_item
  on public.backlog_item_dependencies (backlog_item_id);

create index if not exists idx_backlog_item_dependencies_depends_on
  on public.backlog_item_dependencies (depends_on_backlog_item_id);

alter table public.backlog_item_dependencies enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'backlog_item_dependencies'
      and policyname = 'backlog_item_dependencies_authenticated_select'
  ) then
    create policy backlog_item_dependencies_authenticated_select
      on public.backlog_item_dependencies
      for select
      using (auth.role() = 'authenticated'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'backlog_item_dependencies'
      and policyname = 'backlog_item_dependencies_authenticated_insert'
  ) then
    create policy backlog_item_dependencies_authenticated_insert
      on public.backlog_item_dependencies
      for insert
      with check (auth.role() = 'authenticated'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'backlog_item_dependencies'
      and policyname = 'backlog_item_dependencies_authenticated_update'
  ) then
    create policy backlog_item_dependencies_authenticated_update
      on public.backlog_item_dependencies
      for update
      using (auth.role() = 'authenticated'::text)
      with check (auth.role() = 'authenticated'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'backlog_item_dependencies'
      and policyname = 'backlog_item_dependencies_authenticated_delete'
  ) then
    create policy backlog_item_dependencies_authenticated_delete
      on public.backlog_item_dependencies
      for delete
      using (auth.role() = 'authenticated'::text);
  end if;
end $$;

commit;
