'use client'

import { signOut } from '@/app/actions/auth'

/**
 * SignOutButton – calls the signOut server action.
 * Styled: mono font, small, text-faint, hover acid glow.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          letterSpacing: 'var(--tracking-widest)',
          color: 'var(--color-text-faint)',
          textTransform: 'uppercase',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem 0.5rem',
          transition: 'color var(--duration-default)',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color =
            'var(--color-acid)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color =
            'var(--color-text-faint)'
        }}
      >
        Sign out
      </button>
    </form>
  )
}
