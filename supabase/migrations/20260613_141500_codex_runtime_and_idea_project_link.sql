begin;

alter table public.business_ideas
  add column if not exists promoted_project_id uuid references public.projects(id);

update public.agents
set
  llm_model = case
    when slug = 'alam' then null
    when cost_tier in ('C10', 'C9') then 'gpt-5'
    when cost_tier in ('C8', 'C7', 'C6') then 'gpt-5-mini'
    when cost_tier in ('C5', 'C4', 'C3', 'C2', 'C1') then 'gpt-5-nano'
    else llm_model
  end,
  model = case
    when slug = 'alam' then null
    when cost_tier in ('C10', 'C9') then 'gpt-5'
    when cost_tier in ('C8', 'C7', 'C6') then 'gpt-5-mini'
    when cost_tier in ('C5', 'C4', 'C3', 'C2', 'C1') then 'gpt-5-nano'
    else model
  end,
  updated_at = now();

commit;
