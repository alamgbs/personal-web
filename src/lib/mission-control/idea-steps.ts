export type IdeaStepKind =
  | 'problem-definition'
  | 'customer-archetype'
  | 'customer-journey'
  | 'bmc'
  | 'benchmark'
  | 'pnl'
  | 'cashflow'
  | 'tam'
  | 'moat'
  | 'go-no-go'

export type IdeaFieldDefinition = {
  key: string
  label: string
  placeholder?: string
  tone?: 'default' | 'acid' | 'coral' | 'blue'
}

export type IdeaFieldGroup = {
  label: string
  rows: IdeaFieldDefinition[]
}

export type IdeaStepDefinition = {
  label: string
  hint: string
  questions: string[]
  kind: IdeaStepKind
}

export const PROBLEM_DEFINITION_FIELDS: IdeaFieldDefinition[] = [
  {
    key: 'persona_scope',
    label: 'Quién sufre el problema',
    placeholder: 'Analista de crédito corporate, team lead comercial, jefe de onboarding... (máx. 1 párrafo corto)',
  },
  {
    key: 'critical_symptom',
    label: 'Síntoma crítico observable',
    placeholder: 'Qué ves en el día a día que demuestra que el problema existe. 3 bullets máximo.',
  },
  {
    key: 'problem_trigger',
    label: 'Cuándo se activa',
    placeholder: 'Momento exacto del workflow donde duele. 1 párrafo corto o 3 bullets.',
  },
  {
    key: 'current_solution',
    label: 'Solución actual / workaround',
    placeholder: 'Qué hacen hoy y por qué no alcanza. 3 bullets máximo.',
  },
  {
    key: 'frequency',
    label: 'Frecuencia',
    placeholder: 'Diaria, por alta, por campaña, por lote, etc.',
  },
  {
    key: 'intensity',
    label: 'Intensidad (1-10)',
    placeholder: 'Ej: 8/10 porque frena SLA y genera escalaciones.',
  },
  {
    key: 'cost',
    label: 'Costo visible',
    placeholder: 'Tiempo, dinero, riesgo o pérdida de conversión. 3 bullets máximo.',
  },
  {
    key: 'root_causes',
    label: 'Anatomía del problema / causas raíz',
    placeholder: 'Descompón el problema en 3-4 causas concretas.',
  },
  {
    key: 'pain_points',
    label: 'Pain points priorizados',
    placeholder: 'Top 3 dolores, con severidad y consecuencia.',
  },
  {
    key: 'problem_statement',
    label: 'Problem statement',
    placeholder: '[tipo de cliente] experimenta [problema] cuando intenta [objetivo], lo cual genera [consecuencia].',
  },
  {
    key: 'grandmother_value_statement',
    label: 'Value statement / prueba de la abuela',
    placeholder: 'Explicación simple: qué resuelve, para quién y por qué importa, sin jerga.',
  },
]

export const CUSTOMER_ARCHETYPE_FIELDS: IdeaFieldDefinition[] = [
  { key: 'persona_name', label: 'Arquetipo', placeholder: 'Ej: Martina, ops manager obsesionada con no perder control' },
  { key: 'age_range', label: 'Edad / etapa de vida', placeholder: '29-38, viviendo transición a liderazgo medio' },
  { key: 'location_context', label: 'Contexto geográfico y estilo de vida', placeholder: 'Asunción / CDMX / remoto híbrido / viaja por trabajo' },
  { key: 'education', label: 'Qué estudió', placeholder: 'Ingeniería industrial, administración, autodidacta en data' },
  { key: 'job_role', label: 'Trabajo actual', placeholder: 'Head of Ops, founder, recruiter, analista comercial...' },
  { key: 'years_experience', label: 'Años de experiencia', placeholder: '2-4 años, ya analiza casos con impacto en negocio' },
  { key: 'income_profile', label: 'Perfil de ingreso / capacidad de pago', placeholder: 'Qué presupuesto controla o influencia' },
  { key: 'brands_used', label: 'Marcas / herramientas que usa', placeholder: 'CRM, core bancario, BI, Jira, Slack, etc.' },
  { key: 'devices_channels', label: 'Dispositivos y canales', placeholder: 'Laptop corporativa, email, Teams, WhatsApp, dashboards' },
  { key: 'youtube_media', label: 'Qué ve en YouTube / consume', placeholder: 'Canales, newsletters, podcasts o medios relevantes' },
  { key: 'reading_habits', label: 'Qué lee / hábitos de lectura', placeholder: 'Reportes, resúmenes, compliance updates, benchmarks' },
  { key: 'exercise_lifestyle', label: 'Ejercicio y estilo de vida', placeholder: 'Rutina realista que ayude a imaginar su vida' },
  { key: 'hobbies_interests', label: 'Qué le gusta hacer', placeholder: 'Networking, cursos, side projects, deportes, etc.' },
  { key: 'motivations', label: 'Motivaciones profundas', placeholder: 'Ahorrar tiempo, reducir riesgo, verse competente, crecer' },
  { key: 'frustrations', label: 'Frustraciones actuales', placeholder: 'Fricción, retrabajo, falta de data, demoras, riesgo reputacional' },
  { key: 'goals', label: 'Objetivos del early user', placeholder: 'Qué quiere lograr este año con ese workflow' },
  { key: 'buying_triggers', label: 'Triggers de compra', placeholder: 'Deadline, auditoría, backlog, campaña, presión del jefe...' },
  { key: 'adoption_barriers', label: 'Barreras de adopción', placeholder: 'Miedo al cambio, security review, duda de ROI, integración' },
  { key: 'early_user_thesis', label: 'Tesis del early user', placeholder: 'Por qué este arquetipo probaría primero esta solución' },
]

export const CUSTOMER_JOURNEY_STAGES = [
  { key: 'discovery', label: 'Descubrimiento' },
  { key: 'consideration', label: 'Consideración' },
  { key: 'purchase', label: 'Compra' },
  { key: 'onboarding', label: 'Onboarding / Activación' },
  { key: 'usage', label: 'Uso recurrente' },
  { key: 'advocacy', label: 'Retención / Defensa' },
] as const

export const CUSTOMER_JOURNEY_STAGE_FIELDS: Array<{ suffix: string; label: string; placeholder: string }> = [
  { suffix: 'customer_need', label: 'Necesidad del cliente', placeholder: 'Qué necesita lograr en esta etapa. 3 bullets máximo.' },
  { suffix: 'touchpoints', label: 'Touchpoints', placeholder: 'Canales o interacciones clave. 3 bullets máximo.' },
  { suffix: 'opinion', label: 'Opinión / voz del cliente', placeholder: 'Cita o pensamiento representativo. 1 párrafo corto.' },
  { suffix: 'sentiment', label: 'Sentimiento (1-10)', placeholder: 'Ej: 6/10 — curioso pero escéptico.' },
  { suffix: 'solution', label: 'Posible solución / afterthought', placeholder: 'Qué debería hacer la startup para mejorar esta etapa.' },
] as const

export const CUSTOMER_JOURNEY_FIELDS: IdeaFieldDefinition[] = CUSTOMER_JOURNEY_STAGES.flatMap((stage) =>
  CUSTOMER_JOURNEY_STAGE_FIELDS.map((field) => ({
    key: `${stage.key}_${field.suffix}`,
    label: `${stage.label} · ${field.label}`,
    placeholder: field.placeholder,
  }))
)

export const BMC_FIELDS: IdeaFieldDefinition[] = [
  { key: 'key_partners', label: 'Socios Clave' },
  { key: 'key_activities', label: 'Actividades Clave' },
  { key: 'value_proposition', label: 'Propuesta de Valor' },
  { key: 'key_resources', label: 'Recursos Clave' },
  { key: 'customer_relationships', label: 'Relaciones con Clientes' },
  { key: 'customer_segments', label: 'Segmentos de Clientes' },
  { key: 'cost_structure', label: 'Estructura de Costos' },
  { key: 'channels', label: 'Canales' },
  { key: 'revenue_streams', label: 'Flujos de Ingresos' },
]

export const BENCHMARK_COMPETITOR_ROWS = [
  { key: 'competitor_1', label: 'Competidor / alternativa 1' },
  { key: 'competitor_2', label: 'Competidor / alternativa 2' },
  { key: 'competitor_3', label: 'Competidor / alternativa 3' },
  { key: 'competitor_4', label: 'Competidor / alternativa 4' },
  { key: 'competitor_5', label: 'Competidor / alternativa 5' },
] as const

export const BENCHMARK_COLUMNS: ReadonlyArray<{ suffix: string; label: string; placeholder: string; tone?: IdeaFieldDefinition['tone'] }> = [
  { suffix: 'name', label: 'Nombre', placeholder: 'Empresa, producto o workaround específico', tone: 'acid' },
  { suffix: 'type', label: 'Tipo', placeholder: 'Directo exacto / indirecto / alternativa manual / incumbente' },
  { suffix: 'solution_path', label: 'Cómo resuelve el problema', placeholder: 'La alternativa que ofrece hoy para el mismo job-to-be-done' },
  { suffix: 'pricing', label: 'Precio', placeholder: 'Plan, ACV, fee, freemium, no público o estimación' },
  { suffix: 'users', label: 'Usuarios / escala', placeholder: 'Usuarios, clientes, ARR, descargas o señal pública de escala' },
  { suffix: 'founded', label: 'Fundación', placeholder: 'Año de fundación o inicio de la alternativa' },
  { suffix: 'features', label: 'Features principales', placeholder: '3-5 features relevantes para comparar' },
  { suffix: 'edge_or_gap', label: 'Ventaja / gap', placeholder: 'Qué hacen mejor y dónde dejan una oportunidad', tone: 'coral' },
] as const

export const BENCHMARK_FIELDS: IdeaFieldDefinition[] = BENCHMARK_COMPETITOR_ROWS.flatMap((row) =>
  BENCHMARK_COLUMNS.map((column) => ({
    key: `${row.key}_${column.suffix}`,
    label: `${row.label} · ${column.label}`,
    placeholder: column.placeholder,
    tone: column.tone,
  }))
)

export const PNL_INPUT_GROUPS: IdeaFieldGroup[] = [
  {
    label: 'Ingresos',
    rows: [
      { key: 'revenue_subscription', label: 'Ingresos por suscripción', tone: 'acid' },
      { key: 'revenue_setup', label: 'Implementación / onboarding', tone: 'acid' },
      { key: 'revenue_services', label: 'Servicios / consultoría', tone: 'acid' },
      { key: 'revenue_other', label: 'Otros ingresos', tone: 'acid' },
    ],
  },
  {
    label: 'Costo directo',
    rows: [
      { key: 'cogs_delivery', label: 'Costo de entrega / fulfillment', tone: 'coral' },
      { key: 'cogs_support', label: 'Soporte / customer success directo', tone: 'coral' },
      { key: 'cogs_payment_fees', label: 'Fees / comisiones / pasarela', tone: 'coral' },
    ],
  },
  {
    label: 'Gasto operativo',
    rows: [
      { key: 'opex_founders', label: 'Founders / leadership', tone: 'blue' },
      { key: 'opex_team', label: 'Equipo fijo', tone: 'blue' },
      { key: 'opex_contractors', label: 'Contractors / freelancers', tone: 'blue' },
      { key: 'opex_sales_marketing', label: 'Sales & marketing', tone: 'blue' },
      { key: 'opex_product_engineering', label: 'Producto & ingeniería', tone: 'blue' },
      { key: 'opex_gna', label: 'G&A / legal / finanzas', tone: 'blue' },
      { key: 'opex_infra_tools', label: 'Infraestructura & tools', tone: 'blue' },
      { key: 'opex_other', label: 'Otros OpEx', tone: 'blue' },
    ],
  },
  {
    label: 'Unit economics',
    rows: [
      { key: 'avg_ticket', label: 'Ticket promedio / ACV', tone: 'acid' },
      { key: 'gross_margin_pct', label: 'Margen bruto %', tone: 'acid' },
      { key: 'cac_blended', label: 'CAC blended', tone: 'coral' },
      { key: 'ltv', label: 'LTV', tone: 'blue' },
      { key: 'ltv_cac_ratio', label: 'LTV/CAC', tone: 'blue' },
      { key: 'payback_months', label: 'Payback (meses)', tone: 'blue' },
    ],
  },
  {
    label: 'Cierre',
    rows: [{ key: 'taxes', label: 'Impuestos / ajustes', tone: 'default' }],
  },
]

export const PNL_COMPUTED_ROWS = [
  { key: 'total_revenue', label: 'Total ingresos' },
  { key: 'total_cogs', label: 'Total costo directo' },
  { key: 'gross_profit', label: 'Margen bruto' },
  { key: 'total_opex', label: 'Total OpEx' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'net_income', label: 'Resultado neto' },
] as const

export const CASHFLOW_PERIODS = [
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'Q8',
  'Q9',
  'Q10',
  'Y5',
  'Y10',
] as const

export const CASHFLOW_INFLOW_ROWS: IdeaFieldDefinition[] = [
  { key: 'in_new_sales', label: 'Nuevas ventas', tone: 'acid' },
  { key: 'in_recurring', label: 'Ingresos recurrentes', tone: 'acid' },
  { key: 'in_services', label: 'Servicios / profesional', tone: 'acid' },
  { key: 'in_financing', label: 'Financiamiento / capital', tone: 'acid' },
  { key: 'in_other', label: 'Otros ingresos de caja', tone: 'acid' },
]

export const CASHFLOW_OUTFLOW_ROWS: IdeaFieldDefinition[] = [
  { key: 'out_payroll', label: 'Payroll', tone: 'coral' },
  { key: 'out_sales_marketing', label: 'Ventas & marketing', tone: 'coral' },
  { key: 'out_product_ops', label: 'Producto / operaciones', tone: 'coral' },
  { key: 'out_infra_tools', label: 'Infra / software', tone: 'coral' },
  { key: 'out_capex', label: 'CapEx / equipamiento', tone: 'coral' },
  { key: 'out_other', label: 'Otros egresos', tone: 'coral' },
]

export const COST_PRICING_FIELDS: IdeaFieldDefinition[] = [
  {
    key: 'bootstrap_assumptions',
    label: 'Supuesto financiero base',
    placeholder: 'Bootstrap: Alam como indie dev + Ceci/agentes, sin VC grande; qué implica para el análisis.',
    tone: 'blue',
  },
  {
    key: 'initial_budget_use',
    label: 'Uso del capital inicial',
    placeholder: 'APIs, herramientas, redes sociales, marketing pautado acotado; separar must-have vs nice-to-have.',
    tone: 'blue',
  },
  {
    key: 'fixed_monthly_costs',
    label: 'Costos fijos mensuales',
    placeholder: 'Infra, SaaS, APIs base, dominios, legal/contable mínimo. Rango mensual estimado.',
    tone: 'coral',
  },
  {
    key: 'variable_unit_costs',
    label: 'Costos variables por usuario/uso',
    placeholder: 'LLM/API calls, storage, pagos, soporte, operaciones por transacción o usuario activo.',
    tone: 'coral',
  },
  {
    key: 'pricing_model',
    label: 'Modelo de pricing recomendado',
    placeholder: 'Suscripción, usage-based, freemium, setup fee, tiers; explicar por qué encaja con el buyer.',
    tone: 'acid',
  },
  {
    key: 'estimated_price',
    label: 'Precio estimado',
    placeholder: 'Rango inicial por cliente/usuario/mes/transacción y benchmark de willingness-to-pay.',
    tone: 'acid',
  },
  {
    key: 'gross_margin',
    label: 'Margen bruto estimado',
    placeholder: 'Margen bruto esperado y drivers principales; aclarar sensibilidad a APIs/soporte.',
    tone: 'acid',
  },
  {
    key: 'break_even_threshold',
    label: 'Umbral de break-even',
    placeholder: 'Cuántos clientes/usuarios/ventas cubren costos fijos y variables iniciales.',
    tone: 'blue',
  },
  {
    key: 'bootstrap_risks',
    label: 'Riesgos financieros bootstrap',
    placeholder: 'Qué puede comerse el margen o forzar caja externa; señales tempranas de alerta.',
    tone: 'coral',
  },
  {
    key: 'next_finance_checks',
    label: 'Próximas validaciones financieras',
    placeholder: 'Qué datos validar primero: costos de API, WTP, CAC orgánico/pautado, conversión, churn.',
  },
]

export const TAM_FIELDS: IdeaFieldDefinition[] = [
  { key: 'tam', label: 'TAM — Total Addressable Market', tone: 'acid' },
  { key: 'tam_num', label: 'TAM USD', tone: 'acid' },
  { key: 'sam', label: 'SAM — Serviceable Addressable Market', tone: 'coral' },
  { key: 'sam_num', label: 'SAM USD', tone: 'coral' },
  { key: 'som', label: 'SOM — Serviceable Obtainable Market', tone: 'blue' },
  { key: 'som_num', label: 'SOM USD', tone: 'blue' },
  { key: 'methodology', label: 'Metodología de sizing' },
]

export const MOAT_FIELDS: IdeaFieldDefinition[] = [
  { key: 'switching_costs', label: 'Switching costs', placeholder: 'Qué hace costoso salir una vez que entra' },
  { key: 'data_advantage', label: 'Ventaja de datos', placeholder: 'Qué datos propios mejoran el producto con uso real' },
  { key: 'customer_embeddedness', label: 'Clientes embebidos / lock-in operativo', placeholder: 'Cómo se incrusta en procesos, equipos o workflows' },
  { key: 'network_effects', label: 'Efectos de red / comunidad', placeholder: 'Cómo mejora cuando hay más usuarios, supply o comunidad' },
  { key: 'brand_trust', label: 'Brand / confianza', placeholder: 'Qué credibilidad o marca podría acumular y por qué importa' },
  { key: 'distribution_edge', label: 'Ventaja de distribución', placeholder: 'Canales de distribución difíciles de replicar' },
  { key: 'economies_of_scale', label: 'Economías de escala', placeholder: 'Qué costos bajan o qué performance mejora al crecer' },
  { key: 'speed_learning', label: 'Velocidad de aprendizaje', placeholder: 'Qué aprende más rápido que incumbentes o nuevos entrants' },
  { key: 'weak_points', label: 'Fosas débiles / huecos', placeholder: 'Dónde hoy no hay moat real o es fácilmente copiable' },
  { key: 'moat_building_plan', label: 'Plan para fortalecer la fosa', placeholder: 'Qué activos deben construirse en 6-24 meses' },
  { key: 'moat_score', label: 'Score de moat (1-10)', placeholder: 'Ej: 6/10 hoy, 8/10 si...' },
]

export const GO_NO_GO_FIELDS: IdeaFieldDefinition[] = [
  { key: 'verdict', label: 'Veredicto', placeholder: 'Go, Go condicionado o No-Go. Máx. 1 línea.' },
  { key: 'decision_rationale', label: 'Rationale ejecutivo', placeholder: 'Por qué, en 3-4 bullets máximo.' },
  { key: 'critical_hypotheses', label: 'Hipótesis críticas', placeholder: 'Las 3 hipótesis que decidirán el futuro.' },
  { key: 'validation_experiments', label: 'Experimentos de validación', placeholder: 'Qué probar primero y cómo.' },
  { key: 'success_metrics', label: 'Métricas de éxito a 6 meses', placeholder: 'Solo métricas accionables, 3-4 bullets.' },
  { key: 'major_risks', label: 'Riesgos que pueden matar la idea', placeholder: 'Riesgos principales y señal de alerta.' },
  { key: 'timeline', label: 'Timeline de validación', placeholder: 'Mes 1, mes 2, mes 3...' },
  { key: 'kill_criteria', label: 'Kill criteria', placeholder: 'Qué tendría que pasar para frenar la idea.' },
]

export const IDEA_STEPS: IdeaStepDefinition[] = [
  {
    label: 'Problem Definition + Value Statement',
    hint: 'Anatomía del problema, pain points y cierre con una propuesta de valor que pase la prueba de la abuela',
    kind: 'problem-definition',
    questions: [
      'Describe el síntoma crítico observable, la frecuencia, la intensidad y el costo del problema.',
      'Explica qué hace hoy el cliente para resolverlo, por qué eso no alcanza y cuáles son los 3 pain points más severos.',
      'Redacta el problem statement de forma precisa y termina con un value statement simple que pase la prueba de la abuela.',
    ],
  },
  {
    label: 'Customer Archetype',
    hint: 'Ficha estructurada del early user con JTBD, pains, gains y criterios de priorización',
    kind: 'customer-archetype',
    questions: [
      'Completa la ficha del arquetipo con una persona específica dentro de la empresa, no con la empresa en abstracto.',
      'Formula la situación en formato Jobs-to-be-Done: “Cuando…, quiero…, para poder…”.',
      'Cierra con una cita textual que diría en entrevista y por qué este segmento es accesible, urgente y pagable.',
    ],
  },
  {
    label: 'Customer Journey',
    hint: 'Mapa horizontal de etapas con necesidad, touchpoint, voz del cliente, sentimiento y solución por etapa',
    kind: 'customer-journey',
    questions: [
      'Recorre el journey de izquierda a derecha: descubrimiento, consideración, compra, onboarding, uso y defensa.',
      'En cada etapa, documenta necesidad, touchpoints, opinión, sentimiento y solución concreta.',
      'Mantén cada celda concisa: 3-4 bullets o máximo un párrafo corto.',
    ],
  },
  {
    label: 'Business Model Canvas',
    hint: 'Canvas completo con 9 bloques, coherente con el cliente, el problema y la captura de valor',
    kind: 'bmc',
    questions: [
      'Completa los 9 bloques del canvas sin repetir la misma frase en todos.',
      'Conecta segmentos, propuesta de valor, canales y revenue streams con el dolor principal.',
      'Explica los supuestos más frágiles del modelo de negocio.',
    ],
  },
  {
    label: 'Competitive Benchmark',
    hint: 'Tabla comparativa de competidores directos exactos e indirectos, incluyendo alternativas reales para resolver el problema',
    kind: 'benchmark',
    questions: [
      'Identifica competidores directos exactos y alternativas indirectas que resuelven el mismo problema aunque usen otra solución.',
      'Completa una tabla con nombre, tipo, camino de solución, precio, usuarios o escala, año de fundación, features y gaps.',
      'Si un dato no es público, dilo explícitamente y usa una estimación razonada o una señal proxy verificable.',
    ],
  },
  {
    label: 'TAM / SAM / SOM',
    hint: 'Sizing de mercado con método explícito, supuestos verificables y narrativa de captura',
    kind: 'tam',
    questions: [
      'Explica el método de sizing usado y por qué es creíble.',
      'Justifica la transición de TAM a SAM y de SAM a SOM con filtros concretos.',
      'Aclara qué porción del mercado es realmente atacable en el horizonte inicial.',
    ],
  },
  {
    label: 'P&L + Unit Economics',
    hint: 'Estimación financiera anual con drivers de ingresos, costos variables, OpEx y unit economics',
    kind: 'pnl',
    questions: [
      'Desglosa ingresos, costos y OpEx con lógica explícita.',
      'Incluye unit economics: ticket, margen bruto, CAC, LTV, payback y relación LTV/CAC.',
      'Aclara qué supuestos son más sensibles y qué tendría que pasar para mejorar la rentabilidad.',
    ],
  },
  {
    label: 'Costos, Pricing & Margen',
    hint: 'Análisis simple para proyectos bootstrapped: costos reales, pricing inicial, margen, break-even y riesgos de caja',
    kind: 'cashflow',
    questions: [
      'Asume por defecto un proyecto bootstrapped: Alam como indie dev, Ceci/agentes como apoyo, sin VC ni inversión millonaria inicial.',
      'Estima costos fijos, costos variables por uso/usuario, uso acotado de capital inicial y qué parte puede crecer orgánicamente.',
      'Propón pricing inicial, margen bruto, umbral de break-even y validaciones financieras prioritarias.',
    ],
  },
  {
    label: 'Moat Analysis',
    hint: 'Defendibilidad, moat principal y plan deliberado para fortalecerlo frente a competidores capitalizados',
    kind: 'moat',
    questions: [
      'Evalúa switching costs, datos propios, embeddedness, red, distribución, escala y marca.',
      'Responde qué tendría que superar un competidor capitalizado para romper este moat.',
      'Diferencia qué defendibilidad existe hoy versus cuál todavía es aspiracional.',
    ],
  },
  {
    label: 'Go / No-Go',
    hint: 'Decisión final basada en hipótesis críticas, roadmap de validación y criterio explícito de avance o kill',
    kind: 'go-no-go',
    questions: [
      'Emite una decisión Go / No-Go con postura explícita y sin ambigüedad.',
      'Identifica las 3 hipótesis más críticas y diseña el experimento mínimo viable para validar cada una.',
      'Define timeline, métricas de éxito y kill criteria.',
    ],
  },
]

export const TOTAL_IDEA_STEPS = IDEA_STEPS.length
export const FINAL_IDEA_STEP_INDEX = TOTAL_IDEA_STEPS - 1

export const ALL_PNL_INPUT_ROWS = PNL_INPUT_GROUPS.flatMap((group) => group.rows)
export const ALL_CASHFLOW_ROWS = [...CASHFLOW_INFLOW_ROWS, ...CASHFLOW_OUTFLOW_ROWS]
