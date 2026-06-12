'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { CLUSTERS, type Project } from '@/components/portfolio/ProjectsGraph'

const TimelineSection  = dynamic(() => import('@/components/portfolio/TimelineSection'),  { ssr: false })
const ProjectsGraph    = dynamic(() => import('@/components/portfolio/ProjectsGraph'),    { ssr: false })
const LoadingScreen    = dynamic(() => import('@/components/portfolio/LoadingScreen'),    { ssr: false })

/* ── Translations ─────────────────────────────────────────────────────────── */

type Lang = 'es' | 'en'

const T = {
  es: {
    role:            'Ing. Industrial · Sistemas',
    nav_projects:    'Proyectos',
    nav_tray:        'Trayecto',
    nav_contact:     'Contacto',
    name:            'Alam Benítez',
    descriptor:      'ING. INDUSTRIAL · DATOS · PRODUCTO',
    sub:             'Construyo sistemas que funcionan — automatización de procesos, inteligencia de datos y producto digital. De la planta al código, sin intermediarios.',
    estado_k:        'ESTADO',
    estado_v:        'Disponible · Consulting',
    rol_k:           'ROL',
    rol_v:           'B2B Telecom · Ceragon',
    ubicacion_k:     'UBICACIÓN',
    ubicacion_v:     'Asunción, PY',
    projects_kicker: 'WORK',
    projects_title:  'Proyectos seleccionados',
    footer_copy:     '© 2026 Alam Benítez — Asunción, PY',
  },
  en: {
    role:            'Industrial Eng. · Systems',
    nav_projects:    'Projects',
    nav_tray:        'Journey',
    nav_contact:     'Contact',
    name:            'Alam Benítez',
    descriptor:      'IND. ENGINEERING · DATA · PRODUCT',
    sub:             'I build systems that work — process automation, data intelligence, and digital product. From the plant floor to the codebase.',
    estado_k:        'STATUS',
    estado_v:        'Available · Consulting',
    rol_k:           'ROLE',
    rol_v:           'B2B Telecom · Ceragon',
    ubicacion_k:     'LOCATION',
    ubicacion_v:     'Asunción, PY',
    projects_kicker: 'WORK',
    projects_title:  'Selected projects',
    footer_copy:     '© 2026 Alam Benítez — Asunción, PY',
  },
} as const

/* ── Intersection hook ────────────────────────────────────────────────────── */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Page                                                                      */
/* ══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [lang,            setLang]            = useState<Lang>('es')
  const [scrollPct,       setScrollPct]       = useState(0)
  const [navScrolled,     setNavScrolled]     = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loaded,          setLoaded]          = useState(false)
  const t = T[lang]

  useReveal()

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

  return (
    <>
      {/* Loading screen — plays once, then unmounts */}
      {!loaded && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* ── Scroll rail ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position:    'fixed',
          top:         0,
          left:        0,
          width:       `${scrollPct}%`,
          height:      '1px',
          background:  'var(--color-acid)',
          zIndex:      100,
          transition:  'width 80ms linear',
          pointerEvents: 'none',
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
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
          <b
            style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    700,
              fontSize:      '0.875rem',
              letterSpacing: '0.08em',
              color:         'var(--color-text)',
            }}
          >
            ALAM&nbsp;BENÍTEZ
          </b>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              color:         'var(--color-text-faint)',
              letterSpacing: '0.04em',
            }}
          >
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

          {/* Language toggle */}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          position:   'relative',
          minHeight:  '100dvh',
          display:    'flex',
          alignItems: 'center',
          padding:    'calc(56px + clamp(3rem,8vh,6rem)) clamp(1.5rem,4vw,3rem) clamp(3rem,6vh,5rem)',
          overflow:   'hidden',
        }}
      >
        <TickMark pos="tl" />
        <TickMark pos="br" />

        {/* Left content — ~50% width */}
        <div style={{ maxWidth: 'min(54ch, 50vw)', minWidth: '320px', position: 'relative', zIndex: 2 }}>

          {/* Kicker */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '0.75rem',
              marginBottom: 'clamp(2rem,4vh,3rem)',
            }}
            data-reveal
            className="reveal-fade"
          >
            <span style={{ display: 'block', width: '2rem', height: '1px', background: 'var(--color-acid)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--color-acid)' }}>
              PORTFOLIO — 2026
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.06em', color: 'var(--color-text-faint)' }}>
              Asunción, PY
            </span>
          </div>

          {/* Name — large, direct */}
          <h1
            style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    500,
              fontSize:      'clamp(3rem, 6vw, 6.5rem)',
              lineHeight:    1.0,
              letterSpacing: '-0.04em',
              margin:        0,
              marginBottom:  '1.25rem',
              color:         'var(--color-text)',
            }}
            data-reveal
            className="reveal-clip"
          >
            <span style={{ display: 'inline-block' }}>{t.name}</span>
          </h1>

          {/* Role descriptor — mono, acid, small */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '0.6rem',
              marginBottom: 'clamp(1.5rem,3vh,2.5rem)',
            }}
            data-reveal
            className="reveal-fade"
          >
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.72rem',
                letterSpacing: '0.12em',
                color:         'var(--color-acid)',
              }}
            >
              {t.descriptor}
            </span>
          </div>

          {/* Subtitle */}
          <p
            data-reveal
            className="reveal-fade"
            style={{
              fontFamily:   'var(--font-body)',
              fontSize:     'clamp(0.9rem, 1.3vw, 1.05rem)',
              color:        'var(--color-text-faint)',
              lineHeight:   1.7,
              maxWidth:     '46ch',
              margin:       0,
            }}
          >
            {t.sub}
          </p>

          {/* Meta cells */}
          <div
            style={{
              display:   'flex',
              flexWrap:  'wrap',
              gap:       '0 0',
              marginTop: 'clamp(2.5rem,5vh,4rem)',
            }}
            data-reveal
            className="reveal-fade"
          >
            {[
              { k: t.estado_k,    v: t.estado_v,    dot: true  },
              { k: t.rol_k,       v: t.rol_v,       dot: false },
              { k: t.ubicacion_k, v: t.ubicacion_v, dot: false },
            ].map(({ k, v, dot }) => (
              <div
                key={k}
                style={{
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           '4px',
                  padding:       '0.65rem 1.1rem',
                  borderRight:   '1px solid var(--color-border)',
                  borderTop:     '1px solid var(--color-border)',
                }}
              >
                <span
                  style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.62rem',
                    letterSpacing: '0.1em',
                    color:         'var(--color-text-faint)',
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.82rem',
                    color:      'var(--color-text)',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '0.4em',
                  }}
                >
                  {dot && (
                    <span
                      aria-hidden
                      style={{
                        display:      'inline-block',
                        width:        '7px',
                        height:       '7px',
                        borderRadius: '50%',
                        background:   'var(--color-coral)',
                        flexShrink:   0,
                        animation:    'live-pulse 2s ease-in-out infinite',
                      }}
                    />
                  )}
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side — graph ambient placeholder (ProjectsGraph renders fixed, covers this area) */}
        <div
          aria-hidden
          style={{
            position:      'absolute',
            top:           0,
            right:         0,
            bottom:        0,
            width:         '55%',
            pointerEvents: 'none',
          }}
        />

        {/* Scroll cue */}
        <div
          aria-hidden
          style={{
            position:      'absolute',
            bottom:        'clamp(2rem,4vh,3rem)',
            right:         'clamp(1.5rem,4vw,3rem)',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           '0.5rem',
            opacity:       scrollPct > 2 ? 0 : 1,
            transition:    'opacity 400ms',
          }}
        >
          <span
            style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.65rem',
              letterSpacing: '0.1em',
              color:       'var(--color-text-faint)',
              writingMode: 'vertical-rl',
            }}
          >
            scroll
          </span>
          <span
            style={{
              width:      '1px',
              height:     '48px',
              background: 'linear-gradient(to bottom, var(--color-text-faint), transparent)',
              animation:  'scroll-bar 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROJECTS — Force Graph scroll spacer                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="projects"
        style={{
          position:      'relative',
          height:        '100vh',
          pointerEvents: 'none',
        }}
      >
        {/* Section label */}
        <div
          style={{
            position:      'absolute',
            top:           'clamp(4rem,8vh,7rem)',
            left:          'clamp(1.5rem,4vw,3rem)',
            zIndex:        10,
            pointerEvents: 'none',
          }}
          data-reveal
          className="reveal-fade"
        >
          <span
            style={{
              display:       'block',
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              letterSpacing: '0.12em',
              color:         'var(--color-acid)',
              marginBottom:  '0.5rem',
            }}
          >
            {t.projects_kicker}
          </span>
          <h2
            style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    500,
              fontSize:      'clamp(1.8rem,3.5vw,2.8rem)',
              letterSpacing: '-0.025em',
              lineHeight:    1.15,
              color:         'var(--color-text)',
              margin:        0,
            }}
          >
            {t.projects_title}
          </h2>
        </div>

        {/* Cluster legend */}
        <div
          style={{
            position:      'absolute',
            bottom:        '2rem',
            left:          'clamp(1.5rem,4vw,3rem)',
            zIndex:        10,
            pointerEvents: 'none',
            display:       'flex',
            flexWrap:      'wrap',
            gap:           '0.5rem 1.25rem',
            maxWidth:      '360px',
          }}
        >
          {CLUSTERS.map(cl => (
            <span
              key={cl.id}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '6px',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.65rem',
                letterSpacing: '0.08em',
                color:         'var(--color-text-faint)',
              }}
            >
              <span
                style={{
                  display:      'inline-block',
                  width:        '8px',
                  height:       '8px',
                  borderRadius: '50%',
                  background:   cl.color,
                  flexShrink:   0,
                }}
              />
              {cl.label.toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      {/* Force graph — fixed overlay */}
      <ProjectsGraph selected={selectedProject} onSelect={setSelectedProject} />

      {/* Detail card */}
      <div
        style={{
          position:      'fixed',
          bottom:        '80px',
          right:         '56px',
          zIndex:        20,
          width:         'min(360px, calc(100vw - 2rem))',
          background:    '#111110',
          border:        '1px solid rgba(232,230,223,0.22)',
          borderRadius:  '3px',
          padding:       '1.5rem',
          transform:     selectedProject ? 'translateY(0)' : 'translateY(24px)',
          opacity:       selectedProject ? 1 : 0,
          pointerEvents: selectedProject ? 'auto' : 'none',
          transition:    'transform 320ms cubic-bezier(0.16,1,0.3,1), opacity 320ms ease',
        }}
      >
        {selectedProject && (
          <>
            <button
              onClick={() => setSelectedProject(null)}
              style={{
                position:   'absolute',
                top:        '0.75rem',
                right:      '0.75rem',
                background: 'none',
                border:     'none',
                color:      'var(--color-text-faint)',
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.9rem',
                cursor:     'pointer',
                lineHeight: 1,
                padding:    '4px 6px',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-faint)')}
            >
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.65rem',
                  letterSpacing: '0.1em',
                  color:         CLUSTERS.find(c => c.id === selectedProject.cl)?.color ?? 'var(--color-acid)',
                }}
              >
                {(CLUSTERS.find(c => c.id === selectedProject.cl)?.label ?? selectedProject.cl).toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-faint)' }}>
                {selectedProject.year}
              </span>
            </div>
            <h3
              style={{
                fontFamily:    'var(--font-heading)',
                fontWeight:    500,
                fontSize:      '1.15rem',
                letterSpacing: '-0.015em',
                color:         'var(--color-text)',
                margin:        0,
                marginBottom:  '0.6rem',
              }}
            >
              {selectedProject.title}
            </h3>
            <p
              style={{
                fontFamily:   'var(--font-body)',
                fontSize:     '0.85rem',
                color:        'var(--color-text-faint)',
                lineHeight:   1.65,
                margin:       0,
                marginBottom: '1rem',
              }}
            >
              {selectedProject.desc}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {selectedProject.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.65rem',
                    letterSpacing: '0.06em',
                    color:         'var(--color-text-faint)',
                    border:        '1px solid var(--color-border)',
                    borderRadius:  '2px',
                    padding:       '2px 7px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <TimelineSection />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding:        'clamp(1.5rem,3vh,2rem) clamp(1.5rem,4vw,3rem)',
          borderTop:      '1px solid var(--color-border)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.7rem',
            letterSpacing: '0.06em',
            color:         'var(--color-text-faint)',
          }}
        >
          {t.footer_copy}
        </span>
        <Link
          href="/mission-control"
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.7rem',
            letterSpacing: '0.06em',
            color:         'var(--color-text-faint)',
            opacity:       0.4,
            transition:    'color 200ms, opacity 200ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-acid)'; e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-faint)'; e.currentTarget.style.opacity = '0.4' }}
        >
          [mission control]
        </Link>
      </footer>

      {/* ── Page-level keyframes ─────────────────────────────────────────── */}
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
        .reveal-clip > span {
          transform: translateY(110%);
          transition: transform 650ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-clip.revealed > span { transform: translateY(0); }
        .reveal-fade {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 600ms ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-fade.revealed { opacity: 1; transform: translateY(0); }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
      `}</style>
    </>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function TickMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size  = 10
  const thick = 1
  const color = 'var(--color-border)'
  const base: React.CSSProperties = { position: 'absolute', width: `${size}px`, height: `${size}px`, pointerEvents: 'none' }
  const corners: Record<string, React.CSSProperties> = {
    tl: { top: 0,    left:  0, borderTop:    `${thick}px solid ${color}`, borderLeft:   `${thick}px solid ${color}` },
    tr: { top: 0,    right: 0, borderTop:    `${thick}px solid ${color}`, borderRight:  `${thick}px solid ${color}` },
    bl: { bottom: 0, left:  0, borderBottom: `${thick}px solid ${color}`, borderLeft:   `${thick}px solid ${color}` },
    br: { bottom: 0, right: 0, borderBottom: `${thick}px solid ${color}`, borderRight:  `${thick}px solid ${color}` },
  }
  return <span aria-hidden style={{ ...base, ...corners[pos] }} />
}
