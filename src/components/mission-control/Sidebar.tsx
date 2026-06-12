'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bot, FolderOpen, Lightbulb, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const NAV_ITEMS = [
  { href: '/mission-control', label: 'Overview', icon: Home, exact: true },
  { href: '/mission-control/agentes', label: 'Agentes', icon: Bot, exact: false },
  { href: '/mission-control/proyectos', label: 'Proyectos', icon: FolderOpen, exact: false },
  { href: '/mission-control/ideas', label: 'Ideas', icon: Lightbulb, exact: false },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '240px',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 'var(--z-sidebar)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            marginBottom: '4px',
          }}
        >
          Mission Control
        </span>
        <a
          href="https://alam-b.com"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-faint)',
            textDecoration: 'none',
          }}
        >
          alam-b.com
        </a>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 16px',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                color: active ? 'var(--color-acid)' : 'var(--color-text-faint)',
                textDecoration: 'none',
                borderLeft: active
                  ? '2px solid var(--color-acid)'
                  : '2px solid transparent',
                backgroundColor: active
                  ? 'rgba(214,255,63,0.05)'
                  : 'transparent',
                transition: 'color 0.15s, background-color 0.15s',
              }}
            >
              <Icon
                size={14}
                style={{ flexShrink: 0, strokeWidth: 1.75 }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-text-faint)',
              textAlign: 'left',
            }}
          >
            <LogOut size={13} style={{ strokeWidth: 1.75 }} />
            Sign out
          </button>
        </form>
        <a
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-faint)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          ← Portfolio
        </a>
      </div>
    </aside>
  )
}
