import { createClient } from '@/lib/supabase/server'
import { QuickIdeasInbox } from '@/components/mission-control/QuickIdeasInbox'

/* ── Helpers ─────────────────────────────────────────────────────── */

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/* ── Card wrapper ────────────────────────────────────────────────── */

function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--color-acid)',
        marginBottom: '12px',
      }}
    >
      {children}
    </div>
  )
}

/* ── Priority badge ──────────────────────────────────────────────── */

function PriorityBadge({ priority }: { priority: string | null }) {
  const colors: Record<string, string> = {
    high: 'var(--color-coral)',
    critical: 'var(--color-coral)',
    medium: '#f0a500',
    low: 'var(--color-text-faint)',
  }
  const color = colors[priority ?? 'low'] ?? 'var(--color-text-faint)'
  return (
    <span
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        marginTop: '4px',
      }}
    />
  )
}

/* ── Status badge ────────────────────────────────────────────────── */

function StatusChip({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-faint)',
        border: '1px solid var(--color-border)',
        borderRadius: '3px',
        padding: '1px 5px',
      }}
    >
      {label}
    </span>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */

export default async function MissionControlPage() {
  const supabase = await createClient()
  const today = todayISO()

  // Parallel queries
  const [
    { data: brief },
    { data: backlogRaw },
    { data: quickIdeas },
    { data: projects },
    { data: agents },
    { data: ideasInAnalysis },
  ] = await Promise.all([
    supabase
      .from('daily_briefs')
      .select('id, date, content, highlights')
      .eq('date', today)
      .maybeSingle(),

    supabase
      .from('backlog_items')
      .select('id, title, status, priority, project_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5),

    supabase
      .from('quick_ideas')
      .select('id, title, type, status')
      .in('status', ['inbox', 'todo', 'doing'])
      .order('position', { ascending: true }),

    supabase
      .from('projects')
      .select('id, name, status')
      .eq('status', 'active'),

    supabase
      .from('agents')
      .select('id, status')
      .eq('status', 'active'),

    supabase
      .from('business_ideas')
      .select('id, status')
      .eq('status', 'in_analysis'),
  ])

  // Build project map for backlog items
  const projectIds = [...new Set((backlogRaw ?? []).map((b) => b.project_id).filter(Boolean))]
  const { data: projectNames } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds.length ? projectIds : ['__none__'])

  const projectMap = Object.fromEntries(
    (projectNames ?? []).map((p) => [p.id, p.name])
  )

  const activeProjectCount = projects?.length ?? 0
  const activeAgentCount = agents?.length ?? 0
  const ideasCount = ideasInAnalysis?.length ?? 0

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
      }}
    >
      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Proyectos activos', value: activeProjectCount, color: 'var(--color-acid)' },
          { label: 'Agentes activos', value: activeAgentCount, color: 'var(--color-coral)' },
          { label: 'Ideas en análisis', value: ideasCount, color: '#f0a500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '28px',
                fontWeight: 700,
                color,
                lineHeight: 1,
                marginBottom: '4px',
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-text-faint)',
              }}
            >
              {label}
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column main layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* === LEFT COLUMN === */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Daily Brief */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <SectionLabel>Daily Brief</SectionLabel>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-faint)',
                  textTransform: 'capitalize',
                }}
              >
                {fmtDate(today)}
              </span>
            </div>

            {brief ? (
              <div>
                {brief.highlights && brief.highlights.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {(brief.highlights as string[]).map((h, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-acid)',
                          backgroundColor: 'rgba(214,255,63,0.07)',
                          border: '1px solid rgba(214,255,63,0.2)',
                          borderRadius: '3px',
                          padding: '2px 8px',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{ __html: brief.content ?? '' }}
                />
              </div>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-text-faint)',
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                No hay brief para hoy.
              </p>
            )}
          </Card>

          {/* Recent Activity */}
          <Card>
            <SectionLabel>Actividad reciente</SectionLabel>
            {!backlogRaw || backlogRaw.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-text-faint)',
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                Sin actividad reciente.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {backlogRaw.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 0',
                      borderBottom:
                        idx < backlogRaw.length - 1
                          ? '1px solid var(--color-border)'
                          : 'none',
                    }}
                  >
                    <PriorityBadge priority={item.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: 'var(--color-text)',
                          marginBottom: '3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {item.project_id && projectMap[item.project_id] && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--color-text-faint)',
                            }}
                          >
                            {projectMap[item.project_id]}
                          </span>
                        )}
                        <StatusChip status={item.status} />
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-faint)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {new Date(item.updated_at).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* === RIGHT COLUMN === */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Quick Ideas Inbox */}
          <Card>
            <SectionLabel>Quick Ideas</SectionLabel>
            <QuickIdeasInbox ideas={quickIdeas ?? []} />
          </Card>
        </div>
      </div>
    </div>
  )
}
