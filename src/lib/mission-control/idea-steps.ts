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
    hint: 'Ficha estructurada del early user con JTBD, pains, gains y criterios de priorización',
    kind: 'customer-archetype',
    questions: [
      'Completa la ficha del arquetipo: nombre ficticio, demografía, profesión y contexto de vida real.',
      'Formula la situación en formato Jobs-to-be-Done: “Cuando…, quiero…, para poder…”.',
      'Explica tareas funcionales, emocionales y sociales; además pains, gains, hábitos y canales.',
      'Cierra con una cita textual que diría en entrevista y por qué este segmento es accesible, urgente y pagable.',
    ],
  },
  {
    label: 'Customer Journey',
    hint: 'Mapa de 5 etapas: conciencia, consideración, compra, retención y defensa',
    kind: 'text',
    questions: [
      'Describe qué necesita el cliente en cada etapa: conciencia, consideración, compra, retención y defensa.',
      'Identifica touchpoints, fricciones, sentimiento y una cita representativa en primera persona por etapa.',
      'Señala dónde ocurre la mayor caída o abandono y qué acción concreta debe tomar la startup para corregirla.',
      'Explica qué convierte a un usuario retenido en defensor activo.',
    ],
  },
  {
    label: 'Problem Definition',
    hint: 'Definición del problema con síntoma observable, frecuencia, intensidad, costo y BLAC',
    kind: 'text',
    questions: [
      'Define el síntoma crítico observable que demuestra que existe el problema.',
      'Cuantifica frecuencia, intensidad emocional (1-10) y costo en tiempo o dinero.',
      'Explica qué hace hoy el cliente para resolverlo y por qué eso sigue siendo insuficiente.',
      'Redacta el problema en formato: “[tipo de cliente] experimenta [problema] cuando intenta [objetivo], lo cual genera [consecuencia]” y clasifícalo en BLAC.',
    ],
  },
  {
    label: 'Pain Points',
    hint: 'Dolores priorizados y conectados con jobs, consecuencias y urgencia de solución',
    kind: 'text',
    questions: [
      'Prioriza el dolor principal y los dolores secundarios indicando severidad, frecuencia y riesgo.',
      'Distingue dolores funcionales, emocionales y sociales/reputacionales.',
      'Explica qué consecuencia concreta produce cada dolor si no se resuelve.',
      'Aclara cuál dolor justifica por sí solo que el cliente considere pagar por una solución.',
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
    label: 'P&L Projection',
    hint: 'Estimación financiera anual con drivers de ingresos, costos variables y estructura operativa',
    kind: 'pnl',
    questions: [
      'Desglosa ingreso por cliente, costo por cliente y margen de contribución con lógica explícita.',
      'Separa ingresos, costo directo, OpEx e impuestos con supuestos entendibles.',
      'Evalúa EBITDA proyectado, punto de equilibrio, CAC y LTV de manera consistente.',
      'Aclara qué supuestos son más sensibles y qué tendría que pasar para mejorar la rentabilidad.',
    ],
  },
  {
    label: 'Cash Flow',
    hint: 'Flujo de caja por períodos con entradas, salidas, burn, runway y ciclo de conversión',
    kind: 'cashflow',
    questions: [
      'Proyecta ingresos, egresos y caja neta por período usando composición real de entradas y salidas.',
      'Diferencia profit teórico vs caja disponible y explica si se cobra antes o después de pagar costos clave.',
      'Calcula burn rate, runway y momento proyectado de equilibrio.',
      'Señala los cuellos de caja más peligrosos y cómo mitigarlos.',
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
    label: 'Moat Analysis',
    hint: 'Defendibilidad, moat principal y plan deliberado para fortalecerlo frente a competidores capitalizados',
    kind: 'moat',
    questions: [
      'Evalúa switching costs, datos propios, embeddedness, red, distribución, escala y marca.',
      'Responde qué tendría que superar un competidor capitalizado para romper este moat.',
      'Diferencia qué defendibilidad existe hoy versus cuál todavía es aspiracional.',
      'Cierra con score, huecos y plan concreto para fortalecer la fosa en 6-24 meses.',
    ],
  },
  {
    label: 'Go / No-Go',
    hint: 'Decisión final basada en hipótesis críticas, roadmap de validación y criterio de avance',
    kind: 'text',
    questions: [
      'Emite una decisión Go / No-Go con postura explícita y sin ambigüedad.',
      'Identifica las 3 hipótesis más críticas y diseña el experimento mínimo viable para validar cada una.',
      'Propón timeline de validación: mes 1 entrevistas, mes 2 smoke test/landing, mes 3 MVP.',
      'Distingue métricas vanidosas vs accionables y define el criterio de éxito a 6 meses.',
    ],
  },
]

export const TOTAL_IDEA_STEPS = IDEA_STEPS.length
export const FINAL_IDEA_STEP_INDEX = TOTAL_IDEA_STEPS - 1

export const ALL_PNL_INPUT_ROWS = PNL_INPUT_GROUPS.flatMap((group) => group.rows)
export const ALL_CASHFLOW_ROWS = [...CASHFLOW_INFLOW_ROWS, ...CASHFLOW_OUTFLOW_ROWS]
