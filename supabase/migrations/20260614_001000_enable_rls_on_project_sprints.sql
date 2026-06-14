begin;

alter table public.project_sprints enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_sprints'
      and policyname = 'auth_only'
  ) then
    create policy auth_only
      on public.project_sprints
      for all
      using (auth.role() = 'authenticated'::text);
  end if;
end $$;

commit;
