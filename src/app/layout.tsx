import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono, Hanken_Grotesk } from 'next/font/google'
import './globals.css'

/* ── Fonts ─────────────────────────────────────────────────────────────── */

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-mono',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken-grotesk',
})

/* ── Metadata ───────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: 'Alam Benítez — Portfolio & Mission Control',
    template: '%s · Alam Benítez',
  },
  description:
    'Full-stack developer & designer. Portfolio and personal mission control dashboard.',
  authors: [{ name: 'Alam Benítez' }],
  creator: 'Alam Benítez',
  metadataBase: new URL('https://alambenitez.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Alam Benítez — Portfolio & Mission Control',
    description:
      'Full-stack developer & designer. Portfolio and personal mission control dashboard.',
    siteName: 'Alam Benítez',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alam Benítez — Portfolio & Mission Control',
    description:
      'Full-stack developer & designer. Portfolio and personal mission control dashboard.',
  },
}

/* ── Root Layout ────────────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${hankenGrotesk.variable}`}
    >
      <body className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] font-body antialiased">
        {children}
      </body>
    </html>
  )
}
