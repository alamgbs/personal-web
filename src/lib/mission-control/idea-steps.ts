export type IdeaStepKind =
  | 'text'
  | 'customer-archetype'
  | 'bmc'
  | 'pnl'
  | 'cashflow'
  | 'tam'
  | 'moat'

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

export const CUSTOMER_ARCHETYPE_FIELDS: IdeaFieldDefinition[] = [
  { key: 'persona_name', label: 'Arquetipo', placeholder: 'Ej: Martina, ops manager obsesionada con no perder control' },
  { key: 'age_range', label: 'Edad / etapa de vida', placeholder: '29-38, viviendo transición a liderazgo medio' },
  { key: 'location_context', label: 'Contexto geográfico y estilo de vida', placeholder: 'Asunción / CDMX / remoto híbrido / viaja por trabajo' },
  { key: 'education', label: 'Qué estudió', placeholder: 'Ingeniería industrial, administración, autodidacta en data' },
  { key: 'job_role', label: 'Trabajo actual', placeholder: 'Head of Ops, founder, recruiter, analista comercial...' },
  { key: 'years_experience', label: 'Años de experiencia', placeholder: '6-10 años, ya tomó decisiones con presupuesto propio' },
  { key: 'income_profile', label: 'Perfil de ingreso / capacidad de pago', placeholder: 'Ingreso medio-alto, compra software si reduce fricción visible' },
  { key: 'brands_used', label: 'Marcas / herramientas que usa', placeholder: 'Notion, Slack, HubSpot, Duolingo, Mercado Libre, Nike Run Club...' },
  { key: 'devices_channels', label: 'Dispositivos y canales', placeholder: 'iPhone, MacBook, LinkedIn, WhatsApp, newsletters, podcasts' },
  { key: 'youtube_media', label: 'Qué ve en YouTube / consume', placeholder: 'Canales, podcasts, creators, medios, newsletters' },
  { key: 'reading_habits', label: 'Qué lee / hábitos de lectura', placeholder: 'Libros, blogs, reportes, casi no lee, solo resúmenes' },
  { key: 'exercise_lifestyle', label: 'Ejercicio y estilo de vida', placeholder: 'Se ejercita 4x semana / sedentario / corre / entrena fuerza' },
  { key: 'hobbies_interests', label: 'Qué le gusta hacer', placeholder: 'Viajar, gaming, networking, senderismo, cooking, side projects' },
  { key: 'motivations', label: 'Motivaciones profundas', placeholder: 'Ahorrar tiempo, verse competente, crecer, ganar libertad, status' },
  { key: 'frustrations', label: 'Frustraciones actuales', placeholder: 'Pierde tiempo en tareas manuales, no confía en su stack, vive apagando incendios' },
  { key: 'goals', label: 'Objetivos del early user', placeholder: 'Ascender, facturar más, lanzar rápido, reducir caos operacional' },
  { key: 'buying_triggers', label: 'Triggers de compra', placeholder: 'Dolor urgente, deadline, presión del jefe, benchmark competitivo' },
  { key: 'adoption_barriers', label: 'Barreras de adopción', placeholder: 'Miedo al cambio, onboarding largo, duda de ROI, falta de datos' },
  { key: 'early_user_thesis', label: 'Tesis del early user', placeholder: 'Por qué este arquetipo probaría primero esta solución' },
]

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

export const IDEA_STEPS: IdeaStepDefinition[] = [
  {
    label: 'Customer Archetype',
    hint: 'Perfil profundo del early user ideal',
    kind: 'customer-archetype',
    questions: [
      '¿Quién es el early user real y qué rasgos concretos lo definen más allá de demografía básica?',
      '¿Qué marcas, hábitos, consumos y aspiraciones ayudan a visualizarlo de verdad?',
      '¿Qué trabajo intenta resolver y por qué sentiría urgencia hoy?',
    ],
  },
  {
    label: 'Customer Journey',
    hint: 'Cómo resuelve hoy el problema y dónde se rompe la experiencia',
    kind: 'text',
    questions: [
      '¿Cuáles son los pasos que sigue actualmente para resolver el problema?',
      '¿Qué canales, herramientas o personas participan en cada etapa?',
      '¿Qué emociones experimenta durante el proceso?',
      '¿Dónde están las fricciones y pérdidas de tiempo más claras?',
    ],
  },
  {
    label: 'Problem Definition',
    hint: 'Definir el problema con precisión ejecutiva',
    kind: 'text',
    questions: [
      'Describe el problema central en una sola frase contundente.',
      '¿Por qué sigue mal resuelto hoy?',
      '¿Qué costo funcional, emocional o económico genera no resolverlo?',
    ],
  },
  {
    label: 'Pain Points',
    hint: 'Dolores priorizados por severidad y frecuencia',
    kind: 'text',
    questions: [
      '¿Cuál es el dolor #1 y por qué manda sobre los demás?',
      '¿Qué dolores secundarios aparecen alrededor del principal?',
      '¿Qué tan frecuente y visible es cada dolor?',
      '¿Cuáles son dolores emocionales, reputacionales o políticos además de los funcionales?',
    ],
  },
  {
    label: 'Business Model Canvas',
    hint: 'Llenar los 9 bloques del modelo de negocio usando cada campo dedicado',
    kind: 'bmc',
    questions: [],
  },
  {
    label: 'P&L Projection',
    hint: 'P&L con composición real de ingresos, costos y OpEx',
    kind: 'pnl',
    questions: [],
  },
  {
    label: 'Cash Flow',
    hint: 'Flujo de caja con detalle por componentes y horizonte extendido',
    kind: 'cashflow',
    questions: [],
  },
  {
    label: 'TAM / SAM / SOM',
    hint: 'Sizing de mercado con método explícito',
    kind: 'tam',
    questions: [],
  },
  {
    label: 'Moat Analysis',
    hint: 'Fosas competitivas, defensabilidad y cómo fortalecerlas',
    kind: 'moat',
    questions: [
      '¿Qué protege realmente a la empresa si empieza a ganar usuarios?',
      '¿Dónde aparecen datos, comunidad, switching costs, distribución o lock-in?',
      '¿Qué moat existe hoy y cuál debe construirse deliberadamente?',
    ],
  },
  {
    label: 'Go / No-Go',
    hint: 'Decisión final y condiciones para avanzar',
    kind: 'text',
    questions: [
      '¿Por qué ahora es o no es el momento correcto para avanzar?',
      '¿Cuáles son los 3 supuestos críticos que deben validarse primero?',
      '¿Qué recursos mínimos se necesitan para lanzar un MVP?',
      '¿Cuál sería el criterio de éxito a 6 meses?',
    ],
  },
]

export const TOTAL_IDEA_STEPS = IDEA_STEPS.length
export const FINAL_IDEA_STEP_INDEX = TOTAL_IDEA_STEPS - 1

export const ALL_PNL_INPUT_ROWS = PNL_INPUT_GROUPS.flatMap((group) => group.rows)
export const ALL_CASHFLOW_ROWS = [...CASHFLOW_INFLOW_ROWS, ...CASHFLOW_OUTFLOW_ROWS]
