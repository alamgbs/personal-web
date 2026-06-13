export type AgentRow = {
  id: string
  name: string
  slug: string
  role: string
  team: string | null
  soul: string | null
  soul_short: string | null
  skills: string[] | null
  model: string | null
  llm_model: string | null
  cost_tier: string | null
  parent_id: string | null
  responsibilities: string[] | null
  status: string | null
  avatar_emoji: string | null
}

export const CANONICAL_AGENT_ORDER = [
  'alam',
  'hermes',
  'mkt-lead',
  'sales',
  'social-media-content-manager',
  'cx-analyst',
  'product-lead',
  'research',
  'finance-analyst',
  'ux-ui',
  'product-owner',
  'process-expert',
  'dev-lead',
  'front-dev',
  'back-dev',
  'security-dev',
] as const

export const TEAM_ORDER = ['Command', 'Marketing', 'Product', 'Dev & IT'] as const

export const AGENT_PROVIDER = 'openai-codex' as const

export const COST_TIER_OPTIONS = [
  'C10',
  'C9',
  'C8',
  'C7',
  'C6',
  'C5',
  'C4',
  'C3',
  'C2',
  'C1',
] as const

export const CODEX_MODEL_OPTIONS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'] as const

const canonicalIndex: Record<string, number> = Object.fromEntries(
  CANONICAL_AGENT_ORDER.map((slug, index) => [slug, index])
)
const teamIndex: Record<string, number> = Object.fromEntries(
  TEAM_ORDER.map((team, index) => [team, index])
)

export function sortAgents(agents: AgentRow[]) {
  return [...agents].sort((a, b) => {
    const aCanonical = canonicalIndex[a.slug]
    const bCanonical = canonicalIndex[b.slug]

    if (aCanonical !== undefined || bCanonical !== undefined) {
      if (aCanonical === undefined) return 1
      if (bCanonical === undefined) return -1
      return aCanonical - bCanonical
    }

    const aTeam = teamIndex[a.team || ''] ?? Number.MAX_SAFE_INTEGER
    const bTeam = teamIndex[b.team || ''] ?? Number.MAX_SAFE_INTEGER

    if (aTeam !== bTeam) return aTeam - bTeam

    return a.name.localeCompare(b.name)
  })
}

export function getAgentModel(agent: Pick<AgentRow, 'llm_model' | 'model'>) {
  return agent.llm_model || agent.model || '—'
}

export function getDefaultCodexModelForTier(costTier: string | null) {
  switch (costTier) {
    case 'C10':
    case 'C9':
      return 'gpt-5'
    case 'C8':
    case 'C7':
    case 'C6':
      return 'gpt-5-mini'
    case 'C5':
    case 'C4':
    case 'C3':
    case 'C2':
    case 'C1':
      return 'gpt-5-nano'
    default:
      return null
  }
}

export function getCostTierLabel(agent: Pick<AgentRow, 'cost_tier' | 'slug'>) {
  if (agent.cost_tier) return agent.cost_tier
  if (agent.slug === 'alam') return 'HUMAN'
  return '—'
}

export function getSoulPreview(agent: Pick<AgentRow, 'soul_short' | 'soul'>) {
  return agent.soul_short || agent.soul || '—'
}
