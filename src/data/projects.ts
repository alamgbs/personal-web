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
  // ── Large ──
  { id: 'kapi',     cl: 'vent', year: '2026',  title: 'KAPI',                  desc: 'Fintech educación financiera jóvenes.',                   descLong: 'Plataforma fintech orientada a la educación financiera de jóvenes. Diseño de producto, desarrollo full-stack con Next.js y estrategia de mercado desde cero.',                tags: ['Fintech', 'Next.js'],            size: 'lg' },
  { id: 'rpa',      cl: 'auto', year: '2021',  title: 'RPA & SET',             desc: 'Extracción tributaria SET + segmentación.',               descLong: 'Automatización de extracción tributaria del sistema SET paraguayo mediante RPA. Procesamiento masivo de datos y segmentación de contribuyentes para análisis B2B.',           tags: ['RPA', 'Python'],                 size: 'lg' },
  { id: 'obras',    cl: 'prod', year: '2026',  title: 'Gestión de Obras',      desc: 'Tracking y presupuesto para constructoras.',              descLong: 'Sistema de gestión de obras para constructoras: tracking de avance, control presupuestario y reportes en tiempo real. Producto digital completo desde descubrimiento hasta deploy.',  tags: ['Next.js', 'Supabase'],           size: 'lg' },
  { id: 'karu',     cl: 'vent', year: '2025',  title: 'KaruLab',               desc: 'Meal prep + plataforma nutricional B2B/B2C.',             descLong: 'Emprendimiento de meal prep con plataforma digital para gestión nutricional. App móvil con Expo y backend Supabase, operando en modelo B2B y B2C.',                          tags: ['Expo', 'Supabase'],              size: 'lg' },

  // ── Medium ──
  { id: 'segted',   cl: 'data', year: '2021',  title: 'Segmentación Telco',    desc: 'Clusters por hábitos de consumo B2B/B2C.',                descLong: 'Segmentación de clientes de telecomunicaciones mediante clustering por hábitos de consumo. Modelos de ML aplicados a datos B2B y B2C para estrategias comerciales.',       tags: ['Python', 'ML'],                  size: 'md' },
  { id: 'tudu',     cl: 'prod', year: '2024',  title: 'TUDU App',              desc: 'Plataforma gig commerce para oficios.',                   descLong: 'Diseño de producto para plataforma de gig commerce conectando profesionales de oficios con clientes. UX research, prototipado y validación.',                                 tags: ['UX', 'Product'],                 size: 'md' },
  { id: 'asugreen', cl: 'data', year: '2021+', title: 'ASUGREEN',              desc: 'NDVI satélite + IoT. Google Earth Engine.',               descLong: 'Monitoreo ambiental combinando índices de vegetación NDVI por satélite con datos IoT en terreno. Procesamiento en Google Earth Engine para análisis geoespacial.',            tags: ['GEE', 'Python'],                 size: 'md' },
  { id: 'bigdata',  cl: 'data', year: '2020',  title: 'Big Data — Olist',      desc: 'Spark + Azure sobre dataset de e-commerce.',              descLong: 'Pipeline de Big Data sobre dataset de e-commerce brasileño (Olist). Procesamiento distribuido con Apache Spark en Azure para análisis de patrones de compra.',                tags: ['Spark', 'Azure'],                size: 'md' },

  // ── Small ──
  { id: 'tesis',    cl: 'proc', year: '2018',  title: 'Tesis — Fitomedicina',  desc: 'Análisis termodinámico y modelado de extracción.',        tags: ['Termodinámica', 'I+D'],          size: 'sm' },
  { id: 'nlp',      cl: 'data', year: '2019',  title: 'NLP & Sentiment',       desc: 'Twitter pre-IA, feature engineering puro.',               tags: ['NLP', 'Python'],                 size: 'sm' },
  { id: 'uxab',     cl: 'prod', year: '2020',  title: 'UI/UX & A/B — Berlín',  desc: 'Diseño e experimentación de usuarios.',                   tags: ['UX', 'A/B Test'],                size: 'sm' },
  { id: 'uhueal',   cl: 'vent', year: '2020',  title: 'Uhueal — Founder Inst.',desc: 'Aceleración internacional, Berlín.',                       tags: ['Startup'],                       size: 'sm' },
  { id: 'real',     cl: 'des',  year: '2021',  title: 'Real Estate 3D',        desc: 'SketchUp + Lumion + Unreal Engine.',                      tags: ['3D', 'Unreal'],                  size: 'sm' },
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
