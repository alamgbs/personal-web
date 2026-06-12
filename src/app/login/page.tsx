'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { signIn } from '@/app/actions/auth'

/* ── Submit button (needs useFormStatus inside a <form>) ── */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        backgroundColor: 'var(--color-acid)',
        color: 'var(--color-bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-widest)',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.5 : 1,
        transition:
          'filter var(--duration-default), opacity var(--duration-default)',
        marginTop: '0.25rem',
      }}
      onMouseEnter={(e) => {
        if (!pending)
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.filter = 'none'
      }}
    >
      {pending ? 'Autenticando…' : 'Ingresar'}
    </button>
  )
}

/* ── Corner tick marks ───────────────────────────────────── */
function TickMarks() {
  const size = 8
  const base: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderColor: 'var(--color-border)',
    borderStyle: 'solid',
  }
  return (
    <>
      <span aria-hidden="true" style={{ ...base, top: -1, left: -1, borderWidth: '1px 0 0 1px' }} />
      <span aria-hidden="true" style={{ ...base, top: -1, right: -1, borderWidth: '1px 1px 0 0' }} />
      <span aria-hidden="true" style={{ ...base, bottom: -1, left: -1, borderWidth: '0 0 1px 1px' }} />
      <span aria-hidden="true" style={{ ...base, bottom: -1, right: -1, borderWidth: '0 1px 1px 0' }} />
    </>
  )
}

/* ── Inner form — uses useSearchParams, must be inside Suspense ── */
function LoginForm() {
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')

  const [state, action] = useActionState<{ error: string } | null, FormData>(
    async (_prev, formData) => {
      const result = await signIn(formData)
      return result ?? null
    },
    null,
  )

  const displayError = state?.error ?? callbackError ?? null

  return (
    <form
      action={action}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <label
          htmlFor="email"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wide)',
            color: 'var(--color-text-faint)',
            textTransform: 'uppercase',
          }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            transition: 'border-color var(--duration-default)',
            width: '100%',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-acid)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        />
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <label
          htmlFor="password"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wide)',
            color: 'var(--color-text-faint)',
            textTransform: 'uppercase',
          }}
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            transition: 'border-color var(--duration-default)',
            width: '100%',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-acid)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        />
      </div>

      {/* Error */}
      {displayError && (
        <p
          role="alert"
          style={{
            color: 'var(--color-coral)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            marginTop: '0.125rem',
          }}
        >
          {displayError}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

/* ── Main Login Page ─────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Engineering grid background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Login card */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <TickMarks />

        {/* Wordmark */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-widest)',
            color: 'var(--color-acid)',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          Alam Benítez
        </p>

        {/* Sub-label */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-widest)',
            color: 'var(--color-text-faint)',
            textTransform: 'uppercase',
            marginBottom: '1.75rem',
          }}
        >
          Mission Control
        </p>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2.5rem',
            fontWeight: 500,
            lineHeight: 'var(--leading-tight)',
            color: 'var(--color-text)',
            marginBottom: '1.75rem',
          }}
        >
          Acceso
        </h1>

        {/* Wrap form in Suspense because useSearchParams is used inside */}
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>

        {/* Back to portfolio */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              letterSpacing: 'var(--tracking-wide)',
              color: 'var(--color-text-faint)',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color var(--duration-default)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--color-text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--color-text-faint)'
            }}
          >
            ← Portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Minimal skeleton shown during Suspense hydration ───── */
function FormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: '40px',
            backgroundColor: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-sm)',
            opacity: 0.5,
          }}
        />
      ))}
      <div
        style={{
          height: '44px',
          backgroundColor: 'var(--color-acid)',
          borderRadius: 'var(--radius-sm)',
          opacity: 0.3,
          marginTop: '0.25rem',
        }}
      />
    </div>
  )
}
