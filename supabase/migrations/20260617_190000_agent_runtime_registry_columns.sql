begin;

alter table public.agents
  add column if not exists runtime_profile_name text,
  add column if not exists honcho_ai_peer text,
  add column if not exists runtime_type text,
  add column if not exists default_toolsets text[] default '{}'::text[],
  add column if not exists default_skills text[] default '{}'::text[],
  add column if not exists provider text,
  add column if not exists memory_provider text,
  add column if not exists runtime_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_runtime_type_check'
  ) then
    alter table public.agents
      add constraint agents_runtime_type_check
      check (
        runtime_type is null
        or runtime_type in ('human', 'hermes_profile')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_runtime_status_check'
  ) then
    alter table public.agents
      add constraint agents_runtime_status_check
      check (
        runtime_status is null
        or runtime_status in ('active', 'disabled', 'missing_profile', 'human')
      );
  end if;
end $$;

update public.agents
set
  runtime_type = case when slug = 'alam' then 'human' else 'hermes_profile' end,
  runtime_profile_name = case
    when slug = 'alam' then null
    when slug = 'hermes' then 'mc-hermes'
    when slug = 'product-lead' then 'mc-product-lead'
    when slug = 'research' then 'mc-research'
    when slug = 'finance-analyst' then 'mc-finance-analyst'
    when slug = 'cx-analyst' then 'mc-cx-analyst'
    else runtime_profile_name
  end,
  honcho_ai_peer = case
    when slug = 'alam' then 'alam'
    else slug
  end,
  provider = coalesce(provider, 'openai-codex'),
  memory_provider = coalesce(memory_provider, 'honcho'),
  runtime_status = case
    when slug = 'alam' then 'human'
    when slug in ('hermes', 'product-lead', 'research', 'finance-analyst', 'cx-analyst') then 'active'
    else coalesce(runtime_status, 'disabled')
  end,
  default_toolsets = case
    when slug = 'hermes' then array['web']::text[]
    else coalesce(default_toolsets, '{}'::text[])
  end,
  default_skills = case
    when slug = 'hermes' then array['mission-control-workflows', 'hermes-agent']::text[]
    when slug = 'product-lead' then array['mission-control-workflows']::text[]
    when slug = 'research' then array['mission-control-workflows']::text[]
    when slug = 'finance-analyst' then array['mission-control-workflows']::text[]
    when slug = 'cx-analyst' then array['mission-control-workflows']::text[]
    else coalesce(default_skills, '{}'::text[])
  end,
  updated_at = now();

commit;