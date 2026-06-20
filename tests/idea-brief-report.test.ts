import test from 'node:test'
import assert from 'node:assert/strict'

import { buildIdeaBriefDiscordMessage, buildIdeaBriefFilename, buildIdeaBriefReport } from '../src/lib/mission-control/idea-brief-report'
import { generateIdeaBriefPdf } from '../src/lib/mission-control/idea-brief-pdf'

const sampleStepData = {
  '0': {
    content: 'El problema aparece cuando equipos de onboarding validan clientes con procesos manuales.',
    problem_statement: 'Equipos de onboarding pierden velocidad cuando deben validar datos críticos manualmente.',
    grandmother_value_statement: 'Ayuda a aprobar clientes buenos más rápido sin aumentar riesgo.',
    assigned_agent_name: 'CX Analyst',
  },
  '1': {
    content: 'El early user es una líder de operaciones fintech con presión por SLA y riesgo.',
    persona_name: 'Martina, Head of Ops fintech',
    job_role: 'Head of Operations',
  },
  '2': {
    content: 'El journey tiene fricción en onboarding y uso recurrente.',
    discovery_customer_need: 'Entender si hay una forma más rápida de validar clientes.',
  },
  '3': {
    content: 'Canvas con valor centrado en velocidad y compliance.',
    value_proposition: 'Validación operacional rápida y audit-ready.',
    revenue_streams: 'SaaS mensual + setup enterprise.',
  },
  '4': {
    content: 'Competencia fragmentada entre vendors KYC e internos manuales.',
    competitor_1_name: 'Vendor KYC regional',
    competitor_1_edge_or_gap: 'Cobertura local débil y alto costo de integración.',
  },
  '5': {
    content: 'Sizing viable para fintechs y bancos regionales.',
    tam: 'Instituciones financieras LATAM con flujos KYC digitales.',
    tam_num: '$1.2B',
    sam: 'Fintechs y bancos medianos de mercados iniciales.',
    sam_num: '$180M',
    som: 'Captura inicial con pilotos enterprise.',
    som_num: '$6M',
  },
  '6': {
    content: 'P&L positivo con margen alto si la integración se paquetiza.',
    revenue_subscription: '240000',
    cogs_delivery: '36000',
    opex_team: '120000',
    cac_blended: '4000',
    ltv_cac_ratio: '4.2x',
  },
  '7': {
    content: 'El cash flow depende de cobrar setup antes de costos de implementación.',
    in_new_sales__M1: '12000',
    out_payroll__M1: '8000',
    out_infra_tools__M1: '1000',
  },
  '8': {
    content: 'Moat principalmente en datos operativos y embeddedness.',
    data_advantage: 'Cada validación mejora reglas y señales locales.',
    moat_score: '7/10 si se logra volumen de datos propios.',
  },
  '9': {
    content: 'Go condicionado a validar willingness-to-pay en 3 pilotos.',
    verdict: 'Go condicionado',
    decision_rationale: 'Dolor real, mercado pagable, pero distribución enterprise todavía incierta.',
    critical_hypotheses: 'Los equipos pagan por reducción verificable de tiempos y riesgo.',
    validation_experiments: 'Tres pilotos pagados con fintechs regionales.',
    final_brief_daily_brief_sent_at: '2026-06-20T12:01:00.000Z',
    final_brief_daily_brief_filename: 'kyc-copilot-final-brief.pdf',
  },
}

test('buildIdeaBriefReport uses wizard JSON and surfaces Hermes verdict', () => {
  const report = buildIdeaBriefReport({
    id: 'idea-1',
    title: 'KYC Copilot',
    slug: 'kyc-copilot',
    summary: 'Automatiza validaciones de onboarding financiero.',
    stepData: sampleStepData,
    stepApprovals: { '9': '2026-06-20T12:00:00.000Z' },
  })

  assert.equal(report.title, 'KYC Copilot')
  assert.equal(report.totalSteps, 10)
  assert.equal(report.completedSteps, 10)
  assert.equal(report.verdict, 'Go condicionado')
  assert.ok(report.sections[0].fields.some((field) => field.label === 'Problem statement'))
  assert.ok(report.sections[4].fields.some((field) => field.label.includes('Competidor / alternativa 1')))
  assert.ok(!report.sections[9].fields.some((field) => field.label.includes('Final Brief Daily Brief')))
})

test('Discord message and filename are deterministic and safe', () => {
  const report = buildIdeaBriefReport({
    id: 'idea-1',
    title: 'KYC Copilot',
    slug: 'kyc-copilot',
    summary: null,
    stepData: sampleStepData,
  })

  assert.equal(buildIdeaBriefFilename({ title: 'KYC Copilot', slug: 'KYC Copilot!!' }), 'kyc-copilot-final-brief.pdf')
  assert.ok(buildIdeaBriefDiscordMessage(report).includes('Veredicto Hermes:** Go condicionado'))
})

test('generateIdeaBriefPdf produces a real PDF buffer', async () => {
  const pdf = await generateIdeaBriefPdf({
    id: 'idea-1',
    title: 'KYC Copilot',
    slug: 'kyc-copilot',
    summary: 'Automatiza validaciones de onboarding financiero.',
    stepData: sampleStepData,
    stepApprovals: { '9': '2026-06-20T12:00:00.000Z' },
  })

  assert.ok(pdf.byteLength > 3000)
  assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF')
})
