import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateIdeaRecordShape, upgradeLegacyIdeaStepPayload } from '../src/lib/mission-control/idea-step-migration'

test('migrateIdeaRecordShape remaps the legacy step order into the new Moonshot flow', () => {
  const result = migrateIdeaRecordShape({
    current_step: 9,
    step_data: {
      '0': { content: 'Legacy archetype' },
      '1': { content: 'Legacy journey' },
      '2': { content: 'Legacy problem definition' },
      '3': { content: 'Legacy pain points' },
      '4': { content: 'Legacy BMC' },
      '5': { content: 'Legacy P&L' },
      '6': { content: 'Legacy cashflow' },
      '7': { content: 'Legacy TAM' },
      '8': { content: 'Legacy moat' },
      '9': { content: '# Go / No Go\n\n## Recomendación\nGo condicionado a un MVP muy enfocado.' },
    },
    step_approvals: {
      '2': '2026-06-14T00:00:00.000Z',
      '9': '2026-06-15T00:00:00.000Z',
    },
  })

  assert.equal(result.changed, true)
  assert.equal(result.current_step, 8)
  assert.match(String((result.step_data['0'] as Record<string, unknown>).content || ''), /Legacy problem definition/)
  assert.match(String((result.step_data['0'] as Record<string, unknown>).content || ''), /Legacy pain points/)
  assert.equal((result.step_data['1'] as Record<string, unknown>).content, 'Legacy archetype')
  assert.equal((result.step_data['2'] as Record<string, unknown>).content, 'Legacy journey')
  assert.equal((result.step_data['3'] as Record<string, unknown>).content, 'Legacy BMC')
  assert.equal((result.step_data['4'] as Record<string, unknown>).content, 'Legacy TAM')
  assert.equal((result.step_data['8'] as Record<string, unknown>).content, '# Go / No Go\n\n## Recomendación\nGo condicionado a un MVP muy enfocado.')
  assert.equal(result.step_approvals['0'], '2026-06-14T00:00:00.000Z')
  assert.equal(result.step_approvals['8'], '2026-06-15T00:00:00.000Z')
})

test('upgradeLegacyIdeaStepPayload maps BMC markdown sections to current field keys', () => {
  const result = upgradeLegacyIdeaStepPayload(3, {
    content: `## 1. Propuesta de valor\nUna propuesta concreta.\n\n## 2. Segmentos de clientes\nFintechs y bancos.\n\n## 3. Canales\nVenta directa.\n\n## 4. Relación con clientes\nSoporte consultivo.\n\n## 5. Actividades clave\nOperar la API.\n\n## 6. Recursos clave\nEquipo e infraestructura.\n\n## 7. Socios clave\nPartners KYC.\n\n## 8. Estructura de costos\nInfra y compliance.\n\n## 9. Fuentes de ingresos\nSuscripción + uso.`,
    assigned_agent_slug: 'product-lead',
  })

  assert.equal(result.value_proposition, 'Una propuesta concreta.')
  assert.equal(result.customer_segments, 'Fintechs y bancos.')
  assert.equal(result.channels, 'Venta directa.')
  assert.equal(result.customer_relationships, 'Soporte consultivo.')
  assert.equal(result.key_activities, 'Operar la API.')
  assert.equal(result.key_resources, 'Equipo e infraestructura.')
  assert.equal(result.key_partners, 'Partners KYC.')
  assert.equal(result.cost_structure, 'Infra y compliance.')
  assert.equal(result.revenue_streams, 'Suscripción + uso.')
  assert.equal(result.assigned_agent_slug, 'product-lead')
})

test('upgradeLegacyIdeaStepPayload maps legacy P&L summary rows into current schema', () => {
  const result = upgradeLegacyIdeaStepPayload(5, {
    content: '| Rubro | Año 1 | Año 2 |\n|---|---:|---:|\n| Ingresos | USD 35k–90k | USD 180k–420k |\n| Costo de ventas / entrega | USD 15k–40k | USD 45k–130k |\n| Opex | USD 110k–200k | USD 160k–300k |\n| Resultado operativo | -USD 60k a -150k | -USD 40k a +90k |',
  })

  assert.equal(result.revenue_subscription, 'USD 35k–90k')
  assert.equal(result.cogs_delivery, 'USD 15k–40k')
  assert.equal(result.opex_team, 'USD 110k–200k')
})
