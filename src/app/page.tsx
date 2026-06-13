'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getCluster, type Project } from '@/data/projects'

const TimelineSection    = dynamic(() => import('@/components/portfolio/TimelineSection'),    { ssr: false })
const LoadingScreen      = dynamic(() => import('@/components/portfolio/LoadingScreen'),      { ssr: false })
const HeroSection        = dynamic(() => import('@/components/portfolio/HeroSection'),        { ssr: false })
const ProjectsGrid       = dynamic(() => import('@/components/portfolio/ProjectsGrid'),       { ssr: false })
const MyceliumTransition = dynamic(() => import('@/components/portfolio/MyceliumTransition'), { ssr: false })

/* ── Translations ─────────────────────────────────────────────────────── */

type Lang = 'es' | 'en'

const T = {
  es: {
    role:        'Ing. Industrial · Procesos · Datos',
    nav_projects:'Proyectos',
    nav_tray:    'Trayecto',
    nav_contact: 'Contacto',
    name:        'Alam Benítez',
    descriptor:  'ING. INDUSTRIAL · PROCESOS · DATOS · PRODUCTO DIGITAL',
    sub:         'Diseño modelos operativos para organizaciones — automatización de procesos, inteligencia de datos y producto digital.',
    estado_k:    'ESTADO',
    estado_v:    'Disponible para consultorías externas',
    rol_k:       'SECTOR ACTUAL',
    rol_v:       'B2B Telecom · Ceragon',
    ubicacion_k: 'UBICACIÓN',
    ubicacion_v: 'Asunción, PY',
  },
  en: {
    role:        'Industrial Eng. · Processes · Data',
    nav_projects:'Projects',
    nav_tray:    'Journey',
    nav_contact: 'Contact',
    name:        'Alam Benítez',
    descriptor:  'IND. ENGINEERING · PROCESSES · DATA · DIGITAL PRODUCT',
    sub:         'I design operating models for organizations — process automation, data intelligence, and digital product.',
    estado_k:    'STATUS',
    estado_v:    'Available for external consulting',
    rol_k:       'CURRENT SECTOR',
    rol_v:       'B2B Telecom · Ceragon',
    ubicacion_k: 'LOCATION',
    ubicacion_v: 'Asunción, PY',
  },
} as const

/* ══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const router = useRouter()
  const [lang,        setLang]        = useState<Lang>('es')
  const [scrollPct,   setScrollPct]   = useState(0)
  const [navScrolled, setNavScrolled] = useState(false)
  const [loaded,      setLoaded]      = useState(false)

  // Mycelium transition state
  const [mycelium, setMycelium] = useState<{
    active: boolean
    origin: { x: number; y: number }
    color: string
    targetId: string
  }>({ active: false, origin: { x: 0, y: 0 }, color: '#888', targetId: '' })

  const t = T[lang]

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement
      const top = doc.scrollTop
      const h   = doc.scrollHeight - doc.clientHeight
      setScrollPct(h > 0 ? (top / h) * 100 : 0)
      setNavScrolled(top > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLoadComplete = useCallback(() => setLoaded(true), [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNavigate = useCallback((project: Project, rect: DOMRect) => {
    const cluster = getCluster(project.cl)
    setMycelium({
      active:   true,
      origin:   { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      color:    cluster?.color ?? '#888',
      targetId: project.id,
    })
  }, [])

  const handleMyceliumComplete = useCallback(() => {
    router.push(`/proyectos/${mycelium.targetId}`)
  }, [router, mycelium.targetId])

  return (
    <>
      {!loaded && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* Scroll rail */}
      <div
        aria-hidden
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          width:         `${scrollPct}%`,
          height:        '1px',
          background:    'var(--color-acid)',
          zIndex:        100,
          transition:    'width 80ms linear',
          pointerEvents: 'none',
        }}
      />

      {/* Nav */}
      <header
        style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          zIndex:         50,
          height:         '56px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 clamp(1.5rem, 4vw, 3rem)',
          background:     navScrolled ? 'rgba(12,12,10,0.92)' : 'transparent',
          borderBottom:   navScrolled ? '1px solid var(--color-border)' : '1px solid transparent',
          backdropFilter: navScrolled ? 'blur(12px)' : 'none',
          transition:     'background 300ms, border-color 300ms, backdrop-filter 300ms',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <b style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            ALAM&nbsp;BENÍTEZ
          </b>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-faint)', letterSpacing: '0.04em' }}>
            {t.role}
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          {[
            { label: t.nav_projects, id: 'projects' },
            { label: t.nav_tray,     id: 'tray'     },
            { label: t.nav_contact,  id: 'contact'  },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={id !== 'contact' ? 'hide-sm' : ''}
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.75rem',
                letterSpacing: '0.06em',
                color:         'var(--color-text-faint)',
                background:    'none',
                border:        'none',
                cursor:        'pointer',
                padding:       0,
                transition:    'color 200ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-faint)')}
            >
              {label}
            </button>
          ))}

          <span style={{ display: 'flex', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
            {(['es', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding:       '3px 7px',
                  border:        lang === l ? '1px solid var(--color-acid)' : '1px solid var(--color-border)',
                  borderRadius:  '2px',
                  background:    lang === l ? 'var(--color-acid)' : 'transparent',
                  color:         lang === l ? 'var(--color-bg)' : 'var(--color-text-faint)',
                  cursor:        'pointer',
                  transition:    'all 150ms',
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.7rem',
                  letterSpacing: '0.06em',
                  fontWeight:    lang === l ? 700 : 400,
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        </nav>
      </header>

      {/* Hero */}
      <HeroSection lang={lang} t={t} />

      {/* Projects Grid */}
      <ProjectsGrid onNavigate={handleNavigate} />

      {/* Mycelium transition overlay */}
      <MyceliumTransition
        active={mycelium.active}
        origin={mycelium.origin}
        color={mycelium.color}
        onComplete={handleMyceliumComplete}
      />

      {/* Timeline */}
      <TimelineSection />

      {/* Page-level keyframes */}
      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);    box-shadow: 0 0 0 0 rgba(255,106,61,0.6); }
          50%       { opacity: 0.8; transform: scale(1.15); box-shadow: 0 0 0 5px rgba(255,106,61,0); }
        }
        @keyframes scroll-bar {
          0%   { transform: scaleY(0); transform-origin: top;    opacity: 0; }
          30%  { transform: scaleY(1); transform-origin: top;    opacity: 1; }
          70%  { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
        }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
      `}</style>
    </>
  )
}
