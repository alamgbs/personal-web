export interface Cluster {
  id: string
  label: string
  color: string
}

export interface Project {
  id: string
  cl: string
  year: string
  title: string
  desc: string
  descLong?: string
  tags: readonly string[]
  size: 'lg' | 'md' | 'sm'
}

export const CLUSTERS: Cluster[] = [
  { id: 'auto', label: 'Automatización',  color: 'oklch(0.90 0.16 110)'  },
  { id: 'data', label: 'Datos & IA',      color: 'oklch(0.82 0.085 250)' },
  { id: 'vent', label: 'Emprendimiento',  color: 'oklch(0.80 0.09 350)'  },
  { id: 'prod', label: 'Producto & UX',   color: 'oklch(0.82 0.09 40)'   },
  { id: 'proc', label: 'Procesos',        color: 'oklch(0.84 0.07 130)'  },
  { id: 'des',  label: 'Diseño & 3D',     color: 'oklch(0.82 0.075 300)' },
]

export const PROJECTS: Project[] = [

  // ── Automatización ──
  { id: 'rpa',        cl: 'auto', year: '2021',  title: 'Clasificación Automática de Clientes',
    desc: 'Extracción documental automática para clasificar clientes B2B o B2C.',
    descLong: 'Desarrollé un sistema RPA que extrae datos del SET (sistema tributario paraguayo) eliminando la presentación física de documentos. La información obtenida —facturas, actividad fiscal, volumen— permitía etiquetar automáticamente a cada cliente como B2B o B2C, base para segmentación y estrategia comercial.',
    tags: ['RPA', 'Python', 'SET'],  size: 'lg' },

  { id: 'rutas',      cl: 'auto', year: '2022',  title: 'Optimización de Rutas de Reparto',
    desc: 'Asignación automática de camiones y rutas para distribución gastronómica.',
    descLong: 'Diseñé e implementé un algoritmo de asignación automática de vehículos para rutas de reparto gastronómico. El sistema optimiza recorridos minimizando tiempo y consumo de combustible, considerando ventanas horarias de entrega y capacidad de carga.',
    tags: ['Python', 'Optimización', 'Logística'],  size: 'md' },

  // ── Datos & IA ──
  { id: 'segbanca',   cl: 'data', year: '2021',  title: 'Segmentación de Clientes Bancarios',
    desc: 'Clasificación por hábitos de uso de tarjeta de crédito para campañas comerciales.',
    descLong: 'Modelos de clustering aplicados al comportamiento de uso de TC en el sector bancario. La segmentación permitió categorizar clientes según sus patrones de consumo, mejorando la eficiencia y eficacia de ofertas y campañas comerciales dirigidas.',
    tags: ['Python', 'ML', 'Clustering'],  size: 'lg' },

  { id: 'asugreen',   cl: 'data', year: '2021+', title: 'ASUGREEN',
    desc: 'NDVI satélite + IoT. Google Earth Engine.',
    descLong: 'Monitoreo ambiental combinando índices de vegetación NDVI por satélite con datos IoT en terreno. Procesamiento en Google Earth Engine para análisis geoespacial de zonas urbanas y periurbanas.',
    tags: ['GEE', 'Python', 'IoT'],  size: 'md' },

  { id: 'bigdata',    cl: 'data', year: '2020',  title: 'Big Data — Olist',
    desc: 'Spark + Azure sobre dataset de e-commerce brasileño.',
    descLong: 'Pipeline de Big Data sobre dataset de e-commerce Olist. Procesamiento distribuido con Apache Spark en Azure para análisis de patrones de compra, logística y satisfacción de clientes.',
    tags: ['Spark', 'Azure'],  size: 'md' },

  { id: 'nlp',        cl: 'data', year: '2019',  title: 'NLP & Sentiment',
    desc: 'Twitter pre-IA, feature engineering puro.',
    tags: ['NLP', 'Python'],  size: 'sm' },

  // ── Emprendimiento ──
  { id: 'uhueal',     cl: 'vent', year: '2020',  title: 'Uhueal',
    desc: 'Startup acelerada en Berlín — Founder Institute.',
    descLong: 'Co-fundé Uhueal y la llevé al programa de aceleración Founder Institute en Berlín, una de las aceleradoras de startups más reconocidas a nivel global. El proceso incluyó validación de mercado, pitch internacional y desarrollo de modelo de negocio bajo mentoría de founders y VCs europeos.',
    tags: ['Startup', 'Berlín', 'Founder Institute'],  size: 'lg' },

  { id: 'karu',       cl: 'vent', year: '2025',  title: 'KaruLab',
    desc: 'Meal prep + plataforma nutricional B2B/B2C.',
    descLong: 'Emprendimiento de meal prep con plataforma digital para gestión nutricional. App móvil con Expo y backend Supabase, operando en modelo B2B (empresas) y B2C (personas).',
    tags: ['Expo', 'Supabase'],  size: 'md' },

  { id: 'proptech',   cl: 'vent', year: '2021',  title: 'PropSpace',
    desc: 'Visualización 3D inmersiva para el mercado inmobiliario.',
    descLong: 'Emprendimiento de proptech centrado en experiencias inmersivas para la venta y arriendo de propiedades. Producción de recorridos virtuales y renders hiperrealistas con SketchUp, Lumion y Unreal Engine para clientes del sector inmobiliario.',
    tags: ['3D', 'Unreal', 'Proptech'],  size: 'sm' },

  // ── Producto & UX ──
  { id: 'obras',      cl: 'prod', year: '2026',  title: 'Gestión de Obras',
    desc: 'Tracking y presupuesto en tiempo real para constructoras.',
    descLong: 'Sistema de gestión de obras para constructoras: tracking de avance por etapa, control presupuestario y reportes en tiempo real. Producto digital completo desde discovery hasta deploy.',
    tags: ['Next.js', 'Supabase'],  size: 'lg' },

  { id: 'kapi',       cl: 'prod', year: '2026',  title: 'KAPI',
    desc: 'Fintech de educación financiera para jóvenes.',
    descLong: 'Plataforma fintech orientada a la educación financiera de jóvenes. Diseño de producto, desarrollo full-stack con Next.js y estrategia de go-to-market desde cero.',
    tags: ['Fintech', 'Next.js'],  size: 'lg' },

  { id: 'tudu',       cl: 'prod', year: '2024',  title: 'TUDU App',
    desc: 'Marketplace de servicios para el hogar y oficios.',
    descLong: 'Diseño de producto para plataforma que conecta profesionales de oficios con clientes que necesitan servicios. UX research, prototipado en Figma y validación con usuarios reales.',
    tags: ['UX', 'Product', 'Figma'],  size: 'md' },

  // ── Procesos ──
  { id: 'tesis',      cl: 'proc', year: '2021',  title: 'Extracción de Cannabinoides — CBD',
    desc: 'Proceso de destilación al vacío para producción fitomedicinal.',
    descLong: 'Análisis termodinámico y diseño de un proceso de extracción de cannabinoides a baja temperatura (destilación al vacío), preservando las propiedades medicinales. El proyecto exploró cómo productizar la ley paraguaya vigente que habilita producción familiar y granjas, separando CBD del resto de la planta.',
    tags: ['Termodinámica', 'Proceso', 'Fitomedicina'],  size: 'md' },

  { id: 'l2o',        cl: 'proc', year: '2023',  title: 'Lead-to-Order & Order-to-Cash',
    desc: 'Implementación de Salesforce para lanzamiento de productos B2B.',
    descLong: 'Diseño e implementación del proceso Lead-to-Order y Order-to-Cash en una corporación B2B durante el lanzamiento de nuevos productos. Coordinación transversal con equipos comerciales, operaciones, finanzas y un equipo de desarrollo ágil externo. Plataforma: Salesforce CRM.',
    tags: ['Salesforce', 'Procesos', 'B2B'],  size: 'md' },

  { id: 'proveedores', cl: 'proc', year: '2022', title: 'Cadena de Abastecimiento Gastronómica',
    desc: 'Recepción y pago de proveedores con cadena de frío y control de calidad.',
    descLong: 'Diseño del proceso de recepción, validación y pago a proveedores de materia prima en el sector gastronómico. Incluyó protocolos de cadena de frío, control de calidad en puntos de recepción y flujo de aprobación de pagos.',
    tags: ['Procesos', 'Supply Chain', 'Calidad'],  size: 'sm' },
]

/** Get cluster metadata by id */
export function getCluster(id: string): Cluster | undefined {
  return CLUSTERS.find(c => c.id === id)
}

/** Get project by id */
export function getProject(id: string): Project | undefined {
  return PROJECTS.find(p => p.id === id)
}

/** Projects grouped by cluster, in display order */
export function getProjectsByCluster(): { cluster: Cluster; projects: Project[] }[] {
  return CLUSTERS.map(cluster => ({
    cluster,
    projects: PROJECTS.filter(p => p.cl === cluster.id),
  })).filter(g => g.projects.length > 0)
}
