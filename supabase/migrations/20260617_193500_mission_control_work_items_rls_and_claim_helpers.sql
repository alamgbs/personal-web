begin;

alter table public.mission_control_work_items enable row level security;

create index if not exists idx_mc_work_items_queue_lookup
  on public.mission_control_work_items (status, profile_name, priority, created_at)
  where status = 'queued';

create index if not exists idx_mc_work_items_running_lookup
  on public.mission_control_work_items (status, claimed_by, heartbeat_at)
  where status in ('claimed', 'running');

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mission_control_work_items'
      and policyname = 'mc_work_items_authenticated_select'
  ) then
    create policy mc_work_items_authenticated_select
      on public.mission_control_work_items
      for select
      using (auth.role() = 'authenticated'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mission_control_work_items'
      and policyname = 'mc_work_items_service_insert'
  ) then
    create policy mc_work_items_service_insert
      on public.mission_control_work_items
      for insert
      with check (auth.role() = 'service_role'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mission_control_work_items'
      and policyname = 'mc_work_items_service_update'
  ) then
    create policy mc_work_items_service_update
      on public.mission_control_work_items
      for update
      using (auth.role() = 'service_role'::text)
      with check (auth.role() = 'service_role'::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mission_control_work_items'
      and policyname = 'mc_work_items_service_delete'
  ) then
    create policy mc_work_items_service_delete
      on public.mission_control_work_items
      for delete
      using (auth.role() = 'service_role'::text);
  end if;
end $$;

create or replace function public.mc_claim_work_item(
  p_worker_name text,
  p_profile_name text default null,
  p_source_types text[] default null,
  p_allowed_assignee_slugs text[] default null,
  p_max_attempts integer default null
)
returns public.mission_control_work_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.mission_control_work_items;
  v_now timestamptz := now();
begin
  if coalesce(nullif(btrim(p_worker_name), ''), '') = '' then
    raise exception 'p_worker_name is required';
  end if;

  with candidate as (
    select id
    from public.mission_control_work_items
    where status = 'queued'
      and (
        p_profile_name is null
        or profile_name is null
        or profile_name = p_profile_name
      )
      and (
        p_source_types is null
        or source_type = any(p_source_types)
      )
      and (
        p_allowed_assignee_slugs is null
        or assignee_slug = any(p_allowed_assignee_slugs)
      )
      and (
        p_max_attempts is null
        or attempt_count < p_max_attempts
      )
    order by
      case priority
        when 'urgent' then 4
        when 'high' then 3
        when 'normal' then 2
        when 'low' then 1
        else 0
      end desc,
      created_at asc,
      id asc
    for update skip locked
    limit 1
  )
  update public.mission_control_work_items as wi
  set status = 'running',
      claimed_by = p_worker_name,
      claimed_at = v_now,
      started_at = coalesce(wi.started_at, v_now),
      heartbeat_at = v_now,
      completed_at = null,
      attempt_count = wi.attempt_count + 1,
      last_error = null,
      updated_at = v_now,
      profile_name = coalesce(p_profile_name, wi.profile_name)
  from candidate
  where wi.id = candidate.id
  returning wi.* into v_item;

  return v_item;
end;
$$;

create or replace function public.mc_heartbeat_work_item(
  p_work_item_id uuid,
  p_worker_name text,
  p_output_json jsonb default null
)
returns public.mission_control_work_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.mission_control_work_items;
  v_now timestamptz := now();
begin
  if p_work_item_id is null then
    raise exception 'p_work_item_id is required';
  end if;

  if coalesce(nullif(btrim(p_worker_name), ''), '') = '' then
    raise exception 'p_worker_name is required';
  end if;

  update public.mission_control_work_items
  set status = 'running',
      heartbeat_at = v_now,
      updated_at = v_now,
      output_json = coalesce(p_output_json, output_json)
  where id = p_work_item_id
    and status in ('claimed', 'running')
    and claimed_by = p_worker_name
  returning * into v_item;

  return v_item;
end;
$$;

create or replace function public.mc_complete_work_item(
  p_work_item_id uuid,
  p_worker_name text,
  p_final_status text,
  p_output_markdown text default null,
  p_output_json jsonb default null,
  p_last_error text default null
)
returns public.mission_control_work_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.mission_control_work_items;
  v_now timestamptz := now();
begin
  if p_work_item_id is null then
    raise exception 'p_work_item_id is required';
  end if;

  if coalesce(nullif(btrim(p_worker_name), ''), '') = '' then
    raise exception 'p_worker_name is required';
  end if;

  if p_final_status not in ('completed', 'needs_feedback', 'failed', 'cancelled') then
    raise exception 'p_final_status must be completed, needs_feedback, failed, or cancelled';
  end if;

  update public.mission_control_work_items
  set status = p_final_status,
      output_markdown = coalesce(p_output_markdown, output_markdown),
      output_json = coalesce(p_output_json, output_json),
      last_error = case
        when p_final_status = 'failed' then left(coalesce(p_last_error, last_error, 'failed'), 1000)
        else null
      end,
      completed_at = v_now,
      heartbeat_at = v_now,
      updated_at = v_now
  where id = p_work_item_id
    and status in ('claimed', 'running')
    and claimed_by = p_worker_name
  returning * into v_item;

  return v_item;
end;
$$;

create or replace function public.mc_requeue_work_item(
  p_work_item_id uuid,
  p_worker_name text,
  p_last_error text default null
)
returns public.mission_control_work_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.mission_control_work_items;
  v_now timestamptz := now();
begin
  if p_work_item_id is null then
    raise exception 'p_work_item_id is required';
  end if;

  if coalesce(nullif(btrim(p_worker_name), ''), '') = '' then
    raise exception 'p_worker_name is required';
  end if;

  update public.mission_control_work_items
  set status = 'queued',
      claimed_by = null,
      claimed_at = null,
      started_at = null,
      heartbeat_at = null,
      completed_at = null,
      last_error = left(coalesce(p_last_error, last_error, 'requeued'), 1000),
      updated_at = v_now
  where id = p_work_item_id
    and status in ('claimed', 'running')
    and claimed_by = p_worker_name
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.mc_claim_work_item(text, text, text[], text[], integer) from public;
revoke all on function public.mc_heartbeat_work_item(uuid, text, jsonb) from public;
revoke all on function public.mc_complete_work_item(uuid, text, text, text, jsonb, text) from public;
revoke all on function public.mc_requeue_work_item(uuid, text, text) from public;

grant execute on function public.mc_claim_work_item(text, text, text[], text[], integer) to authenticated, service_role;
grant execute on function public.mc_heartbeat_work_item(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.mc_complete_work_item(uuid, text, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.mc_requeue_work_item(uuid, text, text) to authenticated, service_role;

comment on function public.mc_claim_work_item(text, text, text[], text[], integer)
  is 'Atomically claims the next queued Mission Control work item for a worker/profile and transitions it to running.';
comment on function public.mc_heartbeat_work_item(uuid, text, jsonb)
  is 'Refreshes heartbeat/output_json for a claimed or running Mission Control work item owned by the worker.';
comment on function public.mc_complete_work_item(uuid, text, text, text, jsonb, text)
  is 'Completes a claimed or running Mission Control work item with terminal status and optional artifact/error payload.';
comment on function public.mc_requeue_work_item(uuid, text, text)
  is 'Returns a claimed or running Mission Control work item to queued state for retry, preserving attempt_count.';

commit;
