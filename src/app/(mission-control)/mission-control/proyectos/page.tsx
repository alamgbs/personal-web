import { createClient } from '@/lib/supabase/server'
import { ProjectGrid } from '@/components/mission-control/ProjectGrid'
import { AddProjectForm } from '@/components/mission-control/AddProjectForm'

export const metadata = { title: 'Proyectos · Mission Control' }

export default async function ProyectosPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      backlog_items (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const projectList = projects || []

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            display: 'block',
            marginBottom: '6px',
          }}>
            MISSION CONTROL
          </span>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
          }}>
            Proyectos
          </h1>
          <p style={{
            margin: '6px 0 0',
            fontSize: '14px',
            color: 'var(--color-text-faint)',
          }}>
            Repositorios &amp; Backlog
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
            {projectList.length} proyectos
          </span>
        </div>
      </div>

      {/* Stats bar */}
      {projectList.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '10px 1.25rem',
        }}>
          <div>
            <span style={statValueStyle}>{projectList.filter(p => p.status === 'active').length}</span>
            <span style={statLabelStyle}> activos</span>
          </div>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <div>
            <span style={statValueStyle}>
              {projectList.reduce((sum, p) => sum + (p.backlog_items?.length || 0), 0)}
            </span>
            <span style={statLabelStyle}> items en backlog</span>
          </div>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <div>
            <span style={{ ...statValueStyle, color: 'var(--color-acid)' }}>
              {projectList.reduce((sum, p) => sum + (p.backlog_items?.filter((i: { status: string | null }) => i.status === 'in_progress').length || 0), 0)}
            </span>
            <span style={statLabelStyle}> en progreso</span>
          </div>
        </div>
      )}

      {/* Projects grid */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          marginBottom: '1rem',
        }}>
          REPOSITORIOS
        </div>

        {projectList.length === 0 ? (
          <div style={{
            background: 'var(--color-surface-1)',
            border: '1px dashed var(--color-border)',
            borderRadius: '8px',
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}>
            No hay proyectos aún. Crea el primero abajo.
          </div>
        ) : (
          <ProjectGrid projects={projectList} />
        )}
      </section>

      {/* Add Project */}
      <section style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          marginBottom: '1rem',
        }}>
          GESTIÓN
        </div>
        <AddProjectForm />
      </section>
    </div>
  )
}

const statValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '14px',
  color: 'var(--color-text)',
  fontWeight: 600,
}

const statLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-faint)',
}
