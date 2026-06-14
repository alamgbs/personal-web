import { createClient } from '@/lib/supabase/server'
import { IdeasPanel } from '@/components/mission-control/IdeasPanel'
import { migrateIdeaRecordShape } from '@/lib/mission-control/idea-step-migration'

export const metadata = { title: 'Ideas de Negocio · Mission Control' }

export default async function IdeasPage() {
  const supabase = await createClient()

  const { data: ideas, error } = await supabase
    .from('business_ideas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching ideas:', error)
  }

  const ideaList = (ideas || []).map((idea) => {
    const migrated = migrateIdeaRecordShape({
      current_step: idea.current_step,
      step_data: (idea.step_data as Record<string, unknown>) || {},
      step_approvals: (idea.step_approvals as Record<string, unknown>) || {},
    })

    return {
      ...idea,
      current_step: migrated.current_step,
      step_data: migrated.step_data,
      step_approvals: migrated.step_approvals,
    }
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          display: 'block',
          marginBottom: '4px',
        }}>
          MISSION CONTROL
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: '1.75rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
            }}>
              Ideas de Negocio
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--color-text-faint)',
            }}>
              Wizard de validación en 9 pasos
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
            <span>
              <span style={{ color: 'var(--color-text)' }}>{ideaList.length}</span> ideas
            </span>
            <span>
              <span style={{ color: 'var(--color-acid)' }}>
                {ideaList.filter((i) => i.status === 'in_analysis').length}
              </span> en análisis
            </span>
            <span>
              <span style={{ color: '#4ade80' }}>
                {ideaList.filter((i) => i.status === 'approved').length}
              </span> aprobadas
            </span>
          </div>
        </div>
      </div>

      {/* Main ideas panel */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <IdeasPanel ideas={ideaList} />
      </div>
    </div>
  )
}
