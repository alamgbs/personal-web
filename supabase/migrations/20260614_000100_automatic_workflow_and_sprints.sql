begin;

alter table public.business_ideas
  add column if not exists intake_source text not null default 'manual',
  add column if not exists intake_channel text,
  add column if not exists notification_target text,
  add column if not exists workflow_stage text not null default 'idea_pipeline',
  add column if not exists automation_status text not null default 'queued',
  add column if not exists automation_run_count integer not null default 0,
  add column if not exists last_automation_error text,
  add column if not exists automation_requested_at timestamptz not null default now(),
  add column if not exists automation_completed_at timestamptz,
  add column if not exists review_requested_at timestamptz,
  add column if not exists approved_for_prd_at timestamptz,
  add column if not exists last_notified_stage text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_ideas_workflow_stage_check'
  ) then
    alter table public.business_ideas
      add constraint business_ideas_workflow_stage_check
      check (workflow_stage in (
        'idea_pipeline',
        'idea_review',
        'prd_generation',
        'prd_review',
        'planning_generation',
        'planning_review',
        'sprint_execution',
        'sprint_review',
        'done'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'business_ideas_automation_status_check'
  ) then
    alter table public.business_ideas
      add constraint business_ideas_automation_status_check
      check (automation_status in ('queued', 'running', 'completed', 'needs_feedback', 'blocked', 'failed'));
  end if;
end $$;

alter table public.projects
  add column if not exists source_idea_id uuid references public.business_ideas(id),
  add column if not exists prd_markdown text,
  add column if not exists prd_generated_at timestamptz,
  add column if not exists prd_generated_by text,
  add column if not exists planning_markdown text,
  add column if not exists planning_generated_at timestamptz,
  add column if not exists planning_generated_by text,
  add column if not exists planning_approved_at timestamptz,
  add column if not exists current_sprint_number integer not null default 0,
  add column if not exists execution_status text not null default 'pending_prd',
  add column if not exists sprint_review_status text not null default 'not_started',
  add column if not exists sprint_review_notes text,
  add column if not exists notification_target text,
  add column if not exists last_notified_stage text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_execution_status_check'
  ) then
    alter table public.projects
      add constraint projects_execution_status_check
      check (execution_status in (
        'pending_prd',
        'prd_review',
        'planning_generation',
        'planning_review',
        'sprint_ready',
        'sprint_in_progress',
        'sprint_review',
        'done',
        'blocked'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_sprint_review_status_check'
  ) then
    alter table public.projects
      add constraint projects_sprint_review_status_check
      check (sprint_review_status in ('not_started', 'ready', 'approved', 'changes_requested'));
  end if;
end $$;

alter table public.backlog_items
  add column if not exists sprint_number integer,
  add column if not exists required_skills text[] not null default '{}'::text[],
  add column if not exists review_owner_slug text references public.agents(slug),
  add column if not exists execution_mode text not null default 'build',
  add column if not exists artifact_markdown text,
  add column if not exists stage text not null default 'execution';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'backlog_items_execution_mode_check'
  ) then
    alter table public.backlog_items
      add constraint backlog_items_execution_mode_check
      check (execution_mode in ('planning', 'build', 'review', 'mixed'));
  end if;
end $$;

create table if not exists public.project_sprints (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_number integer not null,
  title text not null,
  goal text,
  status text not null default 'planned',
  summary_markdown text,
  review_markdown text,
  started_at timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, sprint_number)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_sprints_status_check'
  ) then
    alter table public.project_sprints
      add constraint project_sprints_status_check
      check (status in ('planned', 'in_progress', 'in_review', 'approved', 'done', 'blocked'));
  end if;
end $$;

create index if not exists idx_business_ideas_workflow_stage on public.business_ideas (workflow_stage, automation_status);
create index if not exists idx_projects_execution_status on public.projects (execution_status, prd_status, delivery_status);
create index if not exists idx_backlog_items_project_sprint on public.backlog_items (project_id, sprint_number, status);
create index if not exists idx_project_sprints_project_status on public.project_sprints (project_id, status, sprint_number);

update public.business_ideas
set
  workflow_stage = case
    when promoted_project_id is not null then 'prd_review'
    else 'idea_pipeline'
  end,
  automation_status = case
    when promoted_project_id is not null then 'completed'
    when status = 'approved' then 'completed'
    when status = 'rejected' then 'blocked'
    else 'queued'
  end,
  automation_requested_at = coalesce(automation_requested_at, created_at, now()),
  review_requested_at = case
    when promoted_project_id is not null then coalesce(review_requested_at, updated_at, now())
    else review_requested_at
  end;

update public.projects p
set
  source_idea_id = coalesce(source_idea_id, bi.id),
  notification_target = coalesce(notification_target, bi.notification_target),
  execution_status = case
    when p.delivery_status = 'planning' and p.prd_status = 'approved' then 'planning_review'
    when p.prd_status = 'approved' then 'planning_generation'
    else 'pending_prd'
  end
from public.business_ideas bi
where bi.promoted_project_id = p.id;

commit;
