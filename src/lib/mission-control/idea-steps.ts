export type IdeaStepDefinition = {
  label: string
  hint: string
  questions: string[]
  isBMC?: boolean
  isPL?: boolean
  isCashFlow?: boolean
  isTAM?: boolean
}

export const IDEA_STEPS: IdeaStepDefinition[] = [
  {
    label: 'Customer Profile',
    hint: 'Define tu cliente ideal',
    questions: [
      '¿Quién es tu cliente? (edad, género, nivel educativo, ingreso)',
      '¿Qué valores y motivaciones tiene?',
      '¿Cuál es el trabajo principal que intenta realizar (job-to-be-done)?',
      '¿Dónde vive, trabaja, consume contenido?',
    ],
  },
  {
    label: 'Customer Journey',
    hint: 'Cómo resuelven el problema hoy',
    questions: [
      '¿Cuáles son los pasos que sigue actualmente para resolver el problema?',
      '¿Qué canales o herramientas usa en cada etapa?',
      '¿Qué emociones experimenta (frustración, confusión, alivio)?',
      '¿Dónde están los puntos de fricción más grandes?',
    ],
  },
  {
    label: 'Problem Definition',
    hint: 'El problema específico en 1 frase',
    questions: [
      'Describe el problema en UNA sola oración de impacto.',
      '¿Por qué este problema no está bien resuelto hoy?',
      '¿Qué consecuencias tiene para el cliente no resolver esto?',
    ],
  },
  {
    label: 'Pain Points',
    hint: 'Lista de dolores rankeados',
    questions: [
      '¿Cuál es el dolor #1 más crítico?',
      '¿Qué otros dolores secundarios existen?',
      '¿Qué tan frecuente experimenta el cliente estos dolores?',
      '¿Hay dolores emocionales además de funcionales?',
    ],
  },
  {
    label: 'Business Model Canvas',
    hint: '9 bloques del modelo de negocio',
    questions: [],
    isBMC: true,
  },
  {
    label: 'P&L Projection',
    hint: 'Proyección financiera simplificada',
    questions: [],
    isPL: true,
  },
  {
    label: 'Cash Flow',
    hint: 'Flujo de caja mes a mes (12 meses)',
    questions: [],
    isCashFlow: true,
  },
  {
    label: 'TAM / SAM / SOM',
    hint: 'Sizing del mercado',
    questions: [],
    isTAM: true,
  },
  {
    label: 'Go / No-Go',
    hint: 'Decisión final',
    questions: [
      '¿Por qué ahora es el momento correcto para este negocio?',
      '¿Cuáles son los 3 supuestos críticos que deben validarse primero?',
      '¿Qué recursos mínimos necesitas para lanzar un MVP?',
      '¿Cuál es el criterio de éxito a 6 meses?',
    ],
  },
]
