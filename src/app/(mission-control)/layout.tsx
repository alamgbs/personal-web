import { Sidebar } from '@/components/mission-control/Sidebar'

export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <div
        style={{
          flex: 1,
          paddingLeft: '240px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
        }}
      >
        {/* Top Bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            zIndex: 'var(--z-header, 40)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}
          >
            Mission Control
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-faint)',
              textTransform: 'capitalize',
            }}
          >
            {dateStr}
          </span>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
