begin;

alter table public.projects
  add column if not exists prd_status text not null default 'pending';

alter table public.projects
  add column if not exists prd_approved_at timestamptz;

alter table public.projects
  add column if not exists delivery_status text not null default 'waiting_prd';

update public.projects
set
  prd_status = coalesce(prd_status, 'pending'),
  delivery_status = coalesce(delivery_status, 'waiting_prd');

update public.projects
set prd_status = 'pending',
    delivery_status = 'waiting_prd',
    prd_approved_at = null
where slug = 'marketplace-musica-mc';

delete from public.backlog_items
where project_id = (select id from public.projects where slug = 'marketplace-musica-mc')
  and title in (
    'Review PRD · Marketplace de clases online de música',
    'Sprint 0 plan · Marketplace de clases online de música',
    'UX concept · Marketplace de clases online de música',
    'Validation memo · Marketplace de clases online de música'
  );

commit;
