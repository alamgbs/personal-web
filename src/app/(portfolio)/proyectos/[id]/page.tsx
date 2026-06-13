import { notFound } from 'next/navigation'
import { getProject, getCluster, PROJECTS } from '@/data/projects'
import Link from 'next/link'

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }))
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = getProject(id)

  if (!project) notFound()

  const cluster = getCluster(project.cl)
  const color = cluster?.color ?? '#888'

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        padding: 'calc(56px + clamp(3rem,8vh,6rem)) clamp(1.5rem,4vw,3rem) clamp(3rem,6vh,5rem)',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Back link */}
      <Link
        href="/#projects"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          color: 'var(--color-text-faint)',
          textDecoration: 'none',
          marginBottom: 'clamp(2rem,4vh,3rem)',
          transition: 'color 200ms',
        }}
      >
        ← VOLVER
      </Link>

      {/* Category + year */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: color,
          }}
        >
          {cluster?.label.toUpperCase()}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--color-text-faint)',
          }}
        >
          {project.year}
        </span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 500,
          fontSize: 'clamp(2rem, 4vw, 3.5rem)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: 'var(--color-text)',
          margin: 0,
          marginBottom: '1.5rem',
        }}
      >
        {project.title}
      </h1>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
          color: 'var(--color-text-faint)',
          lineHeight: 1.75,
          maxWidth: '60ch',
          margin: '0 0 2rem 0',
        }}
      >
        {project.descLong || project.desc}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {project.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              color: 'var(--color-text-faint)',
              border: '1px solid var(--color-border)',
              padding: '4px 10px',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </main>
  )
}
