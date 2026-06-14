import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateIdeaRecordShape, upgradeLegacyIdeaStepPayload } from '../src/lib/mission-control/idea-step-migration.ts'

test('migrateIdeaRecordShape moves legacy Go/No-Go from step 8 to step 9', () => {
  const result = migrateIdeaRecordShape({
    current_step: 8,
    step_data: {
      '8': {
        content: '# Go / No Go\n\n## Recomendación\nGo condicionado a un MVP muy enfocado.',
        assigned_agent_slug: 'hermes',
      },
    },
    step_approvals: {
      '8': '2026-06-14T00:00:00.000Z',
    },
  })

  assert.equal(result.changed, true)
  assert.equal(result.current_step, 9)
  assert.deepEqual(result.step_data['8'], {})
  assert.deepEqual(result.step_data['9'], {
    content: '# Go / No Go\n\n## Recomendación\nGo condicionado a un MVP muy enfocado.',
    assigned_agent_slug: 'hermes',
  })
  assert.equal(result.step_approvals['9'], '2026-06-14T00:00:00.000Z')
  assert.equal(result.step_approvals['8'], undefined)
})

test('upgradeLegacyIdeaStepPayload maps BMC markdown sections to current field keys', () => {
  const result = upgradeLegacyIdeaStepPayload(4, {
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
