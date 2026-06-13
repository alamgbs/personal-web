begin;

alter table public.agents
  add column if not exists soul_short text,
  add column if not exists cost_tier text,
  add column if not exists llm_model text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_cost_tier_check'
  ) then
    alter table public.agents
      add constraint agents_cost_tier_check
      check (
        cost_tier is null
        or cost_tier in ('C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10')
      );
  end if;
end $$;

update public.agents
set
  soul_short = coalesce(soul_short, soul),
  llm_model = coalesce(llm_model, nullif(model, 'human')),
  updated_at = now();

with seed(
  slug,
  name,
  role,
  team,
  soul_short,
  soul,
  skills,
  llm_model,
  legacy_model,
  cost_tier,
  parent_slug,
  avatar_emoji,
  responsibilities
) as (
  values
    (
      'alam',
      'Alam',
      'Owner',
      'Command',
      'Visionario pragmático; define prioridades, aprueba dirección y decide qué vale la pena perseguir.',
      'Visionario pragmático; define prioridades, aprueba dirección y decide qué vale la pena perseguir.',
      array['prioritization', 'business-judgment', 'approval-gating']::text[],
      null,
      'human',
      null,
      null,
      '👤',
      array['strategy', 'priority', 'approval']::text[]
    ),
    (
      'hermes',
      'Hermes',
      'Orchestrator + Central Memory',
      'Command',
      'Cerebro sistémico que nunca pierde el hilo; coordina, recuerda y convierte caos en decisiones accionables.',
      'Cerebro sistémico que nunca pierde el hilo; coordina, recuerda y convierte caos en decisiones accionables.',
      array['orchestration', 'planning-synthesis', 'cross-team-routing', 'memory-management']::text[],
      'gpt-5.4',
      'gpt-5.4',
      'C10',
      'alam',
      '🧠',
      array['coordination', 'memory', 'planning', 'routing']::text[]
    ),
    (
      'mkt-lead',
      'MKT Lead',
      'Marketing Team Lead',
      'Marketing',
      'Estratega de revenue y audiencia; transforma objetivos de negocio en narrativa, adquisición y crecimiento.',
      'Estratega de revenue y audiencia; transforma objetivos de negocio en narrativa, adquisición y crecimiento.',
      array['positioning', 'go-to-market', 'growth-strategy', 'audience-design']::text[],
      'claude-sonnet-4.5',
      'claude-sonnet-4.5',
      'C9',
      'hermes',
      '📣',
      array['marketing-strategy', 'growth', 'messaging', 'campaign-direction']::text[]
    ),
    (
      'sales',
      'Sales',
      'B2B Opportunity Hunter',
      'Marketing',
      'Persigue oportunidades reales y baja ideas a conversaciones comerciales que pueden cerrar revenue.',
      'Persigue oportunidades reales y baja ideas a conversaciones comerciales que pueden cerrar revenue.',
      array['b2b-outreach', 'proposal-writing', 'pipeline-followup', 'consultative-selling']::text[],
      'gpt-5-mini',
      'gpt-5-mini',
      'C5',
      'mkt-lead',
      '🤝',
      array['outreach', 'decks', 'proposals', 'pipeline-management']::text[]
    ),
    (
      'social-media-content-manager',
      'Social Media Content Manager',
      'Brand Narrative Manager',
      'Marketing',
      'Narrador visual y consistente; mantiene viva la presencia de marca con contenido claro y adaptable.',
      'Narrador visual y consistente; mantiene viva la presencia de marca con contenido claro y adaptable.',
      array['copywriting', 'content-strategy', 'platform-adaptation', 'editorial-planning']::text[],
      'gemini-2.5-flash',
      'gemini-2.5-flash',
      'C4',
      'mkt-lead',
      '📱',
      array['social-content', 'editorial-calendar', 'brand-voice', 'content-repurposing']::text[]
    ),
    (
      'cx-analyst',
      'CX Analyst',
      'Customer Experience Analyst',
      'Marketing',
      'Escucha señales débiles del cliente y las convierte en mejoras concretas para reducir fricción y churn.',
      'Escucha señales débiles del cliente y las convierte en mejoras concretas para reducir fricción y churn.',
      array['journey-mapping', 'nps-design', 'feedback-synthesis', 'churn-diagnosis']::text[],
      'gemini-2.5-flash',
      'gemini-2.5-flash',
      'C4',
      'mkt-lead',
      '🫶',
      array['journeys', 'voice-of-customer', 'retention-insights', 'service-improvements']::text[]
    ),
    (
      'product-lead',
      'Product Lead',
      'Product Team Lead',
      'Product',
      'Convierte ideas en sistemas; ordena hipótesis, alcance y decisiones para que el producto tenga sentido de negocio.',
      'Convierte ideas en sistemas; ordena hipótesis, alcance y decisiones para que el producto tenga sentido de negocio.',
      array['product-strategy', 'jtbd', 'roadmap-slicing', 'definition-of-done']::text[],
      'gpt-5.4',
      'gpt-5.4',
      'C9',
      'hermes',
      '🧭',
      array['discovery', 'planning', 'product-decisions', 'backlog-direction']::text[]
    ),
    (
      'research',
      'Research',
      'Market & Hypothesis Researcher',
      'Product',
      'Explora mercados antes de construir; valida hipótesis con disciplina y evita enamorarse de ideas vacías.',
      'Explora mercados antes de construir; valida hipótesis con disciplina y evita enamorarse de ideas vacías.',
      array['market-research', 'competitor-analysis', 'tam-som-framing', 'hypothesis-validation']::text[],
      'gpt-5-mini',
      'gpt-5-mini',
      'C6',
      'product-lead',
      '🔎',
      array['market-memos', 'competitor-research', 'hypothesis-checks', 'trend-scanning']::text[]
    ),
    (
      'finance-analyst',
      'Finance Analyst',
      'Business Viability Analyst',
      'Product',
      'Traduce ambición en números; obliga a que cada idea pase por el filtro de viabilidad económica.',
      'Traduce ambición en números; obliga a que cada idea pase por el filtro de viabilidad económica.',
      array['financial-modeling', 'scenario-analysis', 'unit-economics', 'investment-logic']::text[],
      'gpt-5-mini',
      'gpt-5-mini',
      'C6',
      'product-lead',
      '📈',
      array['cash-flow', 'unit-economics', 'forecasting', 'viability-analysis']::text[]
    ),
    (
      'ux-ui',
      'UX/UI',
      'Experience Designer',
      'Product',
      'Diseña la experiencia antes que la interfaz; cuida flujo, claridad y percepción del usuario.',
      'Diseña la experiencia antes que la interfaz; cuida flujo, claridad y percepción del usuario.',
      array['user-flows', 'wireframing', 'prototyping', 'interaction-design']::text[],
      'claude-sonnet-4.5',
      'claude-sonnet-4.5',
      'C6',
      'product-lead',
      '🎨',
      array['flows', 'wireframes', 'experience-design', 'interaction-patterns']::text[]
    ),
    (
      'product-owner',
      'Product Owner',
      'Backlog Owner',
      'Product',
      'Protege foco y ritmo; convierte estrategia en backlog claro, priorizado y ejecutable.',
      'Protege foco y ritmo; convierte estrategia en backlog claro, priorizado y ejecutable.',
      array['backlog-management', 'user-stories', 'acceptance-criteria', 'sprint-pacing']::text[],
      'gpt-5-mini',
      'gpt-5-mini',
      'C7',
      'product-lead',
      '📌',
      array['backlog', 'story-writing', 'prioritization', 'delivery-rhythm']::text[]
    ),
    (
      'process-expert',
      'Process Expert',
      'Operations Process Designer',
      'Product',
      'Ordena el caos operativo y documenta procesos para que la organización no dependa de improvisación.',
      'Ordena el caos operativo y documenta procesos para que la organización no dependa de improvisación.',
      array['bpmn', 'raci', 'sop-design', 'process-improvement']::text[],
      'gemini-2.5-flash',
      'gemini-2.5-flash',
      'C5',
      'product-lead',
      '⚙️',
      array['process-mapping', 'documentation', 'raci', 'operating-models']::text[]
    ),
    (
      'dev-lead',
      'Dev Lead',
      'Dev & IT Team Lead',
      'Dev & IT',
      'Piensa en arquitectura, riesgo y entregabilidad; hace que la ambición técnica siga siendo realista.',
      'Piensa en arquitectura, riesgo y entregabilidad; hace que la ambición técnica siga siendo realista.',
      array['technical-scoping', 'systems-architecture', 'integration-risk', 'delivery-feasibility']::text[],
      'claude-sonnet-4.5',
      'claude-sonnet-4.5',
      'C9',
      'hermes',
      '🛠️',
      array['architecture', 'technical-planning', 'delivery-risk', 'systems-design']::text[]
    ),
    (
      'front-dev',
      'Front Dev',
      'Frontend Builder',
      'Dev & IT',
      'Construye lo que el usuario toca; busca interfaces rápidas, claras y bien terminadas.',
      'Construye lo que el usuario toca; busca interfaces rápidas, claras y bien terminadas.',
      array['frontend-architecture', 'react-ui', 'performance-ui', 'design-implementation']::text[],
      'claude-sonnet-4.5',
      'claude-sonnet-4.5',
      'C7',
      'dev-lead',
      '🖥️',
      array['frontend-delivery', 'ui-systems', 'component-implementation', 'performance']::text[]
    ),
    (
      'back-dev',
      'Back Dev',
      'Backend Systems Builder',
      'Dev & IT',
      'Sostiene la lógica invisible del sistema; privilegia robustez, claridad y automatización.',
      'Sostiene la lógica invisible del sistema; privilegia robustez, claridad y automatización.',
      array['api-design', 'database-design', 'automation-systems', 'business-logic']::text[],
      'gpt-5-mini',
      'gpt-5-mini',
      'C7',
      'dev-lead',
      '🗄️',
      array['backend-delivery', 'apis', 'data-modeling', 'automations']::text[]
    ),
    (
      'security-dev',
      'Security Dev',
      'Security & Risk Reviewer',
      'Dev & IT',
      'Protege al sistema de errores caros; piensa en amenazas, exposición y prácticas seguras antes de que sea tarde.',
      'Protege al sistema de errores caros; piensa en amenazas, exposición y prácticas seguras antes de que sea tarde.',
      array['application-security', 'risk-review', 'data-protection', 'integration-hardening']::text[],
      'claude-sonnet-4.5',
      'claude-sonnet-4.5',
      'C6',
      'dev-lead',
      '🛡️',
      array['security-review', 'threat-checks', 'data-safety', 'hardening']::text[]
    )
), updated as (
  update public.agents target
  set
    name = seed.name,
    role = seed.role,
    team = seed.team,
    soul_short = seed.soul_short,
    soul = seed.soul,
    skills = seed.skills,
    llm_model = seed.llm_model,
    model = coalesce(seed.legacy_model, seed.llm_model),
    cost_tier = seed.cost_tier,
    avatar_emoji = seed.avatar_emoji,
    responsibilities = seed.responsibilities,
    status = 'active',
    updated_at = now()
  from seed
  where target.slug = seed.slug
  returning target.slug
), inserted as (
  insert into public.agents (
    name,
    slug,
    role,
    team,
    soul_short,
    soul,
    skills,
    llm_model,
    model,
    cost_tier,
    avatar_emoji,
    responsibilities,
    status
  )
  select
    seed.name,
    seed.slug,
    seed.role,
    seed.team,
    seed.soul_short,
    seed.soul,
    seed.skills,
    seed.llm_model,
    coalesce(seed.legacy_model, seed.llm_model),
    seed.cost_tier,
    seed.avatar_emoji,
    seed.responsibilities,
    'active'
  from seed
  where not exists (
    select 1 from public.agents existing where existing.slug = seed.slug
  )
  returning slug
)
update public.agents child
set
  parent_id = parent.id,
  updated_at = now()
from seed
left join public.agents parent on parent.slug = seed.parent_slug
where child.slug = seed.slug
  and child.parent_id is distinct from parent.id;

commit;
