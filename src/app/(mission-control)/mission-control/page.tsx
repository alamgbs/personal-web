// Mission Control — coming soon placeholder with real structure
export default function MissionControlPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg, #0c0c0a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--color-text, #e8e4dc)',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-acid, #d6ff3f)',
        }}
      >
        MISSION CONTROL — INITIALIZING
      </span>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-heading, sans-serif)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        En construcción.
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          color: 'var(--color-text-faint, #6b6762)',
          maxWidth: '360px',
          lineHeight: 1.6,
        }}
      >
        Dashboard de agentes, proyectos e ideas de negocio. Acceso restringido.
      </p>
      <a
        href="/"
        style={{
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-faint, #6b6762)',
          textDecoration: 'none',
          border: '1px solid rgba(232,228,220,0.12)',
          borderRadius: '999px',
          padding: '8px 20px',
          transition: 'color .2s, border-color .2s',
        }}
      >
        ← Volver al portfolio
      </a>
    </div>
  )
}
