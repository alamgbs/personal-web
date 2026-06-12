'use client'

import { useState } from 'react'
import { ProjectBacklog } from './ProjectBacklog'

type BacklogItem = {
  id: string
  project_id: string | null
  title: string
  description: string | null
  status: string | null
  priority: string | null
  type: string | null
  assignee_slug: string | null
  tags: string[] | null
  position: number | null
}

type Project = {
  id: string
  name: string
  slug: string
  description: string | null
  github_repo: string | null
  status: string | null
  tech_stack: string[] | null
  url: string | null
  backlog_items?: BacklogItem[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-acid)',
  paused: '#9b988e',
  completed: '#4ade80',
  archived: 'var(--color-text-faint)',
}

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1rem',
      }}>
        {projects.map((project) => {
          const items = project.backlog_items || []
          const backlogCount = items.filter((i) => i.status === 'backlog').length
          const inProgressCount = items.filter((i) => i.status === 'in_progress').length
          const doneCount = items.filter((i) => i.status === 'done').length
          const isExpanded = expanded === project.id

          return (
            <div key={project.id} style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              {/* Card header */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{
                    margin: 0,
                    fontFamily: 'var(--font-heading)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.01em',
                  }}>
                    {project.name}
                  </h3>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    background: 'transparent',
                    border: `1px solid ${STATUS_COLORS[project.status || 'active'] || 'var(--color-border)'}`,
                    color: STATUS_COLORS[project.status || 'active'] || 'var(--color-text-faint)',
                  }}>
                    {project.status || 'active'}
                  </span>
                </div>

                {project.description && (
                  <p style={{
                    margin: '0 0 10px',
                    fontSize: '13px',
                    color: 'var(--color-text-faint)',
                    lineHeight: 1.5,
                  }}>
                    {project.description}
                  </p>
                )}

                {/* Tech stack */}
                {project.tech_stack && project.tech_stack.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                    {project.tech_stack.map((tech) => (
                      <span key={tech} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        letterSpacing: '0.08em',
                        padding: '2px 7px',
                        background: 'var(--color-surface-3)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '3px',
                        color: 'var(--color-text-faint)',
                        textTransform: 'uppercase',
                      }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Links + counts row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {project.github_repo && (
                      <a
                        href={project.github_repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-text-faint)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.06em',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⌥ GitHub
                      </a>
                    )}
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-text-faint)',
                          textDecoration: 'none',
                          letterSpacing: '0.06em',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗ URL
                      </a>
                    )}
                  </div>

                  {/* Backlog stats */}
                  <div style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                    <span style={{ color: 'var(--color-text-faint)' }}><span style={{ color: 'var(--color-text)' }}>{backlogCount}</span> backlog</span>
                    <span style={{ color: 'var(--color-text-faint)' }}><span style={{ color: 'var(--color-acid)' }}>{inProgressCount}</span> active</span>
                    <span style={{ color: 'var(--color-text-faint)' }}><span style={{ color: '#4ade80' }}>{doneCount}</span> done</span>
                  </div>
                </div>
              </div>

              {/* Toggle backlog */}
              <button
                onClick={() => toggle(project.id)}
                style={{
                  width: '100%',
                  background: 'var(--color-surface-2)',
                  border: 'none',
                  borderTop: '1px solid var(--color-border)',
                  padding: '7px 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-faint)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <span>BACKLOG ({items.length})</span>
                <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </button>

              {/* Backlog content */}
              {isExpanded && (
                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
                  <ProjectBacklog projectId={project.id} items={items} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
