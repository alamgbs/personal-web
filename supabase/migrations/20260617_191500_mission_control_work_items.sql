begin;

create table if not exists public.mission_control_work_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  source_type text not null,
  source_id uuid not null,
  source_step_index integer,
  idempotency_key text not null unique,
  assignee_slug text not null references public.agents(slug) on delete restrict,
  profile_name text,
  skill_names text[] not null default '{}'::text[],
  status text not null default 'queued',
  priority text not null default 'normal',
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb,
  output_markdown text,
  claimed_by text,
  claimed_at timestamptz,
  started_at timestamptz,
  heartbeat_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_type in ('business_idea_step', 'project_artifact', 'backlog_item_bridge')),
  check (status in ('queued', 'claimed', 'running', 'completed', 'needs_feedback', 'failed', 'cancelled')),
  check (priority in ('low', 'normal', 'high', 'urgent')),
  check (source_step_index is null or source_step_index >= 0),
  check (
    (status = 'queued' and claimed_at is null and started_at is null and completed_at is null)
    or status <> 'queued'
  ),
  check (
    (status = 'claimed' and claimed_at is not null and completed_at is null)
    or status <> 'claimed'
  ),
  check (
    (status = 'running' and claimed_at is not null and started_at is not null and completed_at is null)
    or status <> 'running'
  ),
  check (
    (status in ('completed', 'needs_feedback', 'failed', 'cancelled') and completed_at is not null)
    or status not in ('completed', 'needs_feedback', 'failed', 'cancelled')
  )
);

create index if not exists idx_mc_work_items_status_priority_created
  on public.mission_control_work_items (status, priority, created_at);

create index if not exists idx_mc_work_items_assignee_status
  on public.mission_control_work_items (assignee_slug, status, created_at);

create index if not exists idx_mc_work_items_profile_status
  on public.mission_control_work_items (profile_name, status, created_at)
  where profile_name is not null;

create index if not exists idx_mc_work_items_source
  on public.mission_control_work_items (source_type, source_id, source_step_index);

create index if not exists idx_mc_work_items_claimed
  on public.mission_control_work_items (claimed_at)
  where status in ('claimed', 'running');

alter table public.mission_control_work_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mission_control_work_items'
      and policyname = 'auth_only'
  ) then
    create policy auth_only
      on public.mission_control_work_items
      for all
      using (auth.role() = 'authenticated'::text);
  end if;
end $$;

commit;
