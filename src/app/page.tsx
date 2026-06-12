'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ── Data ─────────────────────────────────────────────────────────────────── */

const PROJECTS = [
  {
    cat:  'DATA & IA',
    year: '2021',
    title: 'ASUGREEN',
    desc:  'NDVI + satellite imagery via Google Earth Engine. Vegetation/traffic/temp correlation.',
    tags:  ['GEE', 'Python', 'NDVI'],
  },
  {
    cat:  'PRODUCTO',
    year: '2026',
    title: 'Gestión de Obras',
    desc:  'Progress tracking, budget approval y reporting para constructoras. B2B focus.',
    tags:  ['Next.js', 'Supabase', 'B2B'],
  },
  {
    cat:  'VENTURES',
    year: '2025',
    title: 'KaruLab',
    desc:  'Meal prep + plataforma nutricional B2B/B2C con macro tracking.',
    tags:  ['Expo', 'React Native', 'Supabase'],
  },
  {
    cat:  'VENTURES',
    year: '2026',
    title: 'KAPI',
    desc:  'Fintech para educación financiera de jóvenes. Acelerado en Moonshot/ITTI.',
    tags:  ['Fintech', 'Next.js', 'TypeScript'],
  },
  {
    cat:  'DATA & IA',
    year: '2021',
    title: 'Segmentación Telco',
    desc:  'Python + análisis de transacciones para segmentar hábitos de consumo B2B/B2C.',
    tags:  ['Python', 'Clustering', 'Telco'],
  },
  {
    cat:  'AUTOMATIZACIÓN',
    year: '2021',
    title: 'RPA & SET',
    desc:  'Automatización extracción perfil tributario SET para segmentación empresarial.',
    tags:  ['RPA', 'Python', 'Telco'],
  },
] as const

const TIMELINE = [
  { period: '2013–2018', role: 'Ing. Industrial',         org: 'FIUNA',           loc: 'Asunción, PY', side: 'top'    },
  { period: '2019',      role: 'Academic Residency',      org: 'Heidelberg',      loc: 'DE',           side: 'bottom' },
  { period: '2021',      role: 'Senior PM',               org: 'SBC',             loc: 'Asunción, PY', side: 'top'    },
  { period: '2021–24',   role: 'Datos & Automatización',  org: 'Millicom · Tigo', loc: 'Asunción, PY', side: 'bottom' },
  { period: '2025–now',  role: 'B2B Telecom',             org: 'Ceragon',         loc: 'Asunción, PY', side: 'top'    },
] as const

/* ── Translations ─────────────────────────────────────────────────────────── */

type Lang = 'es' | 'en'

const T = {
  es: {
    role:        'Ing. Industrial · Sistemas',
    nav_projects:'Proyectos',
    nav_tray:    'Trayecto',
    nav_contact: 'Contacto',
    kicker:      'PORTFOLIO — 2026',
    h1:          ['Pienso', 'en sistemas.', 'Construyo con', 'curiosidad'],
    h1_dim:      [false, false, true, true],
    sub:         'Ingeniero industrial que convierte procesos desordenados en sistemas medibles — automatización, datos y producto, de la planta al código.',
    estado_k:    'ESTADO',
    estado_v:    'Disponible · Consulting',
    rol_k:       'ROL',
    rol_v:       'B2B Telecom · Ceragon',
    ubicacion_k: 'UBICACIÓN',
    ubicacion_v: 'Asunción, PY',
    projects_kicker: 'WORK',
    projects_title:  'Proyectos seleccionados',
    timeline_kicker: 'TRAYECTO',
    timeline_title:  'Experiencia & formación',
    contact_kicker:  'CONTACTO',
    contact_title:   '¿Trabajamos juntos?',
    contact_sub:     'Disponible para consulting, proyectos de datos y colaboraciones B2B.',
    contact_cta:     'Escribir un mensaje',
    footer_copy:     '© 2026 Alam Benítez — Asunción, PY',
  },
  en: {
    role:        'Industrial Eng. · Systems',
    nav_projects:'Projects',
    nav_tray:    'Journey',
    nav_contact: 'Contact',
    kicker:      'PORTFOLIO — 2026',
    h1:          ['I think', 'in systems.', 'I build with', 'curiosity'],
    h1_dim:      [false, false, true, true],
    sub:         'Industrial engineer turning messy processes into measurable systems — automation, data and product, from plant to code.',
    estado_k:    'STATUS',
    estado_v:    'Available · Consulting',
    rol_k:       'ROLE',
    rol_v:       'B2B Telecom · Ceragon',
    ubicacion_k: 'LOCATION',
    ubicacion_v: 'Asunción, PY',
    projects_kicker: 'WORK',
    projects_title:  'Selected projects',
    timeline_kicker: 'JOURNEY',
    timeline_title:  'Experience & education',
    contact_kicker:  'CONTACT',
    contact_title:   'Shall we work together?',
    contact_sub:     'Available for consulting, data projects and B2B collaborations.',
    contact_cta:     'Send a message',
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
  const [lang, setLang] = useState<Lang>('es')
  const [scrollPct, setScrollPct] = useState(0)
  const [navScrolled, setNavScrolled] = useState(false)
  const t = T[lang]

  useReveal()

  useEffect(() => {
    function onScroll() {
      const doc  = document.documentElement
      const top  = doc.scrollTop
      const h    = doc.scrollHeight - doc.clientHeight
      setScrollPct(h > 0 ? (top / h) * 100 : 0)
      setNavScrolled(top > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* ── Scroll rail ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollPct}%`,
          height: '1px',
          background: 'var(--color-acid)',
          zIndex: 100,
          transition: 'width 80ms linear',
          pointerEvents: 'none',
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          right:      0,
          zIndex:     50,
          height:     '56px',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding:    '0 clamp(1.5rem, 4vw, 3rem)',
          background: navScrolled
            ? 'rgba(12,12,10,0.92)'
            : 'transparent',
          borderBottom: navScrolled
            ? '1px solid var(--color-border)'
            : '1px solid transparent',
          backdropFilter: navScrolled ? 'blur(12px)' : 'none',
          transition: 'background 300ms, border-color 300ms, backdrop-filter 300ms',
        }}
      >
        {/* Wordmark */}
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

        {/* Nav links */}
        <nav
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '1.75rem',
          }}
        >
          <button
            onClick={() => scrollTo('projects')}
            className="nav-link hide-sm"
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
            {t.nav_projects}
          </button>
          <button
            onClick={() => scrollTo('tray')}
            className="nav-link hide-sm"
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
            {t.nav_tray}
          </button>
          <button
            onClick={() => scrollTo('contact')}
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
            {t.nav_contact}
          </button>
          {/* Language toggle */}
          <span
            style={{
              display:       'flex',
              gap:           '2px',
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              letterSpacing: '0.06em',
            }}
          >
            {(['es', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding:    '3px 7px',
                  border:     lang === l ? '1px solid var(--color-acid)' : '1px solid var(--color-border)',
                  borderRadius: '2px',
                  background: lang === l ? 'var(--color-acid)' : 'transparent',
                  color:      lang === l ? 'var(--color-bg)' : 'var(--color-text-faint)',
                  cursor:     'pointer',
                  transition: 'all 150ms',
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '0.7rem',
                  letterSpacing: '0.06em',
                  fontWeight: lang === l ? 700 : 400,
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
          position:      'relative',
          minHeight:     '100dvh',
          display:       'flex',
          flexDirection: 'column',
          justifyContent:'center',
          padding:       'calc(56px + clamp(3rem,8vh,6rem)) clamp(1.5rem,4vw,3rem) clamp(3rem,6vh,5rem)',
          overflow:      'hidden',
        }}
      >
        {/* Tick marks */}
        <TickMark pos="tl" />
        <TickMark pos="br" />

        {/* Main column */}
        <div style={{ maxWidth: '900px' }}>
          {/* Kicker */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '0.75rem',
              marginBottom:'clamp(1.5rem,3vh,2.5rem)',
            }}
            data-reveal
            className="reveal-fade"
          >
            <span
              style={{
                display:        'block',
                width:          '2rem',
                height:         '1px',
                background:     'var(--color-acid)',
                flexShrink:     0,
              }}
            />
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.75rem',
                letterSpacing: '0.12em',
                color:         'var(--color-acid)',
              }}
            >
              {t.kicker}
            </span>
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.75rem',
                letterSpacing: '0.06em',
                color:         'var(--color-text-faint)',
              }}
            >
              Asunción, PY
            </span>
          </div>

          {/* H1 */}
          <h1
            style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    500,
              fontSize:      'clamp(2.8rem, 7vw, 7rem)',
              lineHeight:    1.08,
              letterSpacing: '-0.03em',
              margin:        0,
              marginBottom:  'clamp(1.5rem,3vh,2.5rem)',
            }}
          >
            {t.h1.map((line, i) => (
              <span
                key={i}
                data-reveal
                className="reveal-clip"
                style={{
                  display:       'block',
                  overflow:      'hidden',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    color:   t.h1_dim[i] ? 'var(--color-text-faint)' : 'var(--color-text)',
                  }}
                >
                  {line}
                  {/* Cursor blink on last line */}
                  {i === t.h1.length - 1 && (
                    <span
                      aria-hidden
                      style={{
                        display:        'inline-block',
                        width:          '0.55em',
                        height:         '0.85em',
                        background:     'var(--color-acid)',
                        marginLeft:     '0.1em',
                        verticalAlign:  'text-bottom',
                        animation:      'cursor-blink 1.1s step-end infinite',
                      }}
                    />
                  )}
                </span>
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <p
            data-reveal
            className="reveal-fade"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   'clamp(0.95rem, 1.4vw, 1.1rem)',
              color:      'var(--color-text-faint)',
              lineHeight: 1.65,
              maxWidth:   '560px',
              margin:     0,
            }}
          >
            {t.sub}
          </p>
        </div>

        {/* Meta cells — bottom left */}
        <div
          style={{
            display:   'flex',
            flexWrap:  'wrap',
            gap:       '0 2px',
            marginTop: 'clamp(3rem,6vh,5rem)',
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
                padding:       '0.75rem 1.25rem',
                borderRight:   '1px solid var(--color-border)',
                minWidth:      '140px',
              }}
            >
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.65rem',
                  letterSpacing: '0.1em',
                  color:         'var(--color-text-faint)',
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.85rem',
                  color:         'var(--color-text)',
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '0.4em',
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

        {/* Scroll cue — bottom right */}
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
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.65rem',
              letterSpacing: '0.1em',
              color:         'var(--color-text-faint)',
              writingMode:   'vertical-rl',
            }}
          >
            scroll
          </span>
          <span
            style={{
              width:        '1px',
              height:       '48px',
              background:   `linear-gradient(to bottom, var(--color-text-faint), transparent)`,
              animation:    'scroll-bar 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROJECTS                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="projects"
        style={{
          padding:  'clamp(4rem,8vh,7rem) clamp(1.5rem,4vw,3rem)',
          position: 'relative',
        }}
      >
        <TickMark pos="tl" />

        {/* Section header */}
        <div
          style={{ marginBottom: 'clamp(2.5rem,5vh,4rem)' }}
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

        {/* Grid */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap:                 '1px',
            border:              '1px solid var(--color-border)',
          }}
        >
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.title} project={p} delay={i * 60} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="tray"
        style={{
          padding:  'clamp(4rem,8vh,7rem) clamp(1.5rem,4vw,3rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <TickMark pos="tl" />

        {/* Section header */}
        <div
          style={{ marginBottom: 'clamp(3rem,6vh,5rem)' }}
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
            {t.timeline_kicker}
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
            {t.timeline_title}
          </h2>
        </div>

        {/* Timeline track */}
        <div
          style={{
            position:   'relative',
            paddingTop: '8rem',
          }}
        >
          {/* Horizontal line */}
          <div
            style={{
              position:   'absolute',
              top:        '8rem',
              left:       0,
              right:      0,
              height:     '1px',
              background: 'var(--color-border)',
            }}
          />

          {/* Items */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: `repeat(${TIMELINE.length}, 1fr)`,
              gap:                 0,
            }}
          >
            {TIMELINE.map((item, i) => (
              <TimelineItem key={item.period} item={item} index={i} />
            ))}
          </div>

          {/* Bottom row spacer */}
          <div style={{ height: '8rem' }} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTACT                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="contact"
        style={{
          padding:    'clamp(5rem,10vh,8rem) clamp(1.5rem,4vw,3rem)',
          position:   'relative',
          borderTop:  '1px solid var(--color-border)',
        }}
      >
        <TickMark pos="tl" />
        <TickMark pos="tr" />

        <div
          style={{
            maxWidth:  '640px',
          }}
          data-reveal
          className="reveal-fade"
        >
          {/* Kicker */}
          <span
            style={{
              display:       'block',
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              letterSpacing: '0.12em',
              color:         'var(--color-acid)',
              marginBottom:  '1rem',
            }}
          >
            {t.contact_kicker}
          </span>

          {/* Title */}
          <h2
            style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    500,
              fontSize:      'clamp(2rem,4vw,3.5rem)',
              letterSpacing: '-0.03em',
              lineHeight:    1.1,
              color:         'var(--color-text)',
              margin:        0,
              marginBottom:  '1.5rem',
            }}
          >
            {t.contact_title}
          </h2>

          {/* Sub */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   '1rem',
              color:      'var(--color-text-faint)',
              lineHeight: 1.65,
              marginBottom:'2.5rem',
            }}
          >
            {t.contact_sub}
          </p>

          {/* CTA row */}
          <div
            style={{
              display:    'flex',
              flexWrap:   'wrap',
              alignItems: 'center',
              gap:        '1rem',
            }}
          >
            <a
              href="mailto:hola@alambenitez.com"
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           '0.5rem',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.8rem',
                letterSpacing: '0.06em',
                color:         'var(--color-bg)',
                background:    'var(--color-acid)',
                padding:       '0.65rem 1.25rem',
                borderRadius:  '2px',
                transition:    'opacity 200ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              hola@alambenitez.com
            </a>

            <a
              href="https://github.com/alambenitez"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.75rem',
                letterSpacing: '0.06em',
                color:         'var(--color-text-faint)',
                padding:       '0.65rem 1rem',
                border:        '1px solid var(--color-border)',
                borderRadius:  '2px',
                transition:    'color 200ms, border-color 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--color-text)'
                e.currentTarget.style.borderColor = 'var(--color-text-faint)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-text-faint)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              GitHub
            </a>

            <a
              href="https://linkedin.com/in/alambenitez"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.75rem',
                letterSpacing: '0.06em',
                color:         'var(--color-text-faint)',
                padding:       '0.65rem 1rem',
                border:        '1px solid var(--color-border)',
                borderRadius:  '2px',
                transition:    'color 200ms, border-color 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--color-text)'
                e.currentTarget.style.borderColor = 'var(--color-text-faint)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-text-faint)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding:       'clamp(1.5rem,3vh,2rem) clamp(1.5rem,4vw,3rem)',
          borderTop:     '1px solid var(--color-border)',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          flexWrap:      'wrap',
          gap:           '0.5rem',
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
          onMouseEnter={e => {
            e.currentTarget.style.color   = 'var(--color-acid)'
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color   = 'var(--color-text-faint)'
            e.currentTarget.style.opacity = '0.4'
          }}
        >
          [mission control]
        </Link>
      </footer>

      {/* ── Page-level keyframes (injected once) ───────────────────────── */}
      <style>{`
        /* Cursor blink */
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        /* Live coral pulse */
        @keyframes live-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);   box-shadow: 0 0 0 0 rgba(255,106,61,0.6); }
          50%       { opacity: 0.8; transform: scale(1.15); box-shadow: 0 0 0 5px rgba(255,106,61,0);  }
        }

        /* Scroll bar drip */
        @keyframes scroll-bar {
          0%   { transform: scaleY(0); transform-origin: top;    opacity: 0; }
          30%  { transform: scaleY(1); transform-origin: top;    opacity: 1; }
          70%  { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
        }

        /* Reveal: clip from bottom */
        .reveal-clip > span {
          transform: translateY(110%);
          transition: transform 650ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-clip.revealed > span {
          transform: translateY(0);
        }

        /* Reveal: fade + rise */
        .reveal-fade {
          opacity:   0;
          transform: translateY(18px);
          transition: opacity 600ms ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-fade.revealed {
          opacity:   1;
          transform: translateY(0);
        }

        /* Hide on small screens */
        @media (max-width: 640px) {
          .hide-sm { display: none !important; }
        }

        /* Timeline card hover */
        .tl-card:hover {
          border-color: var(--color-text-faint) !important;
        }

        /* Project card hover */
        .proj-card:hover {
          background: var(--color-surface-1) !important;
        }
        .proj-card:hover .proj-arrow {
          opacity: 1 !important;
          transform: translate(2px, -2px) !important;
        }
      `}</style>
    </>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function TickMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size  = 10
  const thick = 1
  const color = 'var(--color-border)'

  const base: React.CSSProperties = {
    position:  'absolute',
    width:     `${size}px`,
    height:    `${size}px`,
    pointerEvents: 'none',
  }

  const corners: Record<string, React.CSSProperties> = {
    tl: { top:    0, left:  0, borderTop:    `${thick}px solid ${color}`, borderLeft:   `${thick}px solid ${color}` },
    tr: { top:    0, right: 0, borderTop:    `${thick}px solid ${color}`, borderRight:  `${thick}px solid ${color}` },
    bl: { bottom: 0, left:  0, borderBottom: `${thick}px solid ${color}`, borderLeft:   `${thick}px solid ${color}` },
    br: { bottom: 0, right: 0, borderBottom: `${thick}px solid ${color}`, borderRight:  `${thick}px solid ${color}` },
  }

  return <span aria-hidden style={{ ...base, ...corners[pos] }} />
}

/* ── Project card ─────────────────────────────────────────────────────────── */

function ProjectCard({
  project,
  delay,
}: {
  project: typeof PROJECTS[number]
  delay:   number
}) {
  return (
    <article
      className="proj-card"
      data-reveal
      style={{
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.75rem',
        padding:        'clamp(1.25rem,3vw,2rem)',
        background:     'transparent',
        borderRight:    '1px solid var(--color-border)',
        borderBottom:   '1px solid var(--color-border)',
        cursor:         'default',
        transition:     'background 200ms',
        animationDelay: `${delay}ms`,
        position:       'relative',
      }}
    >
      {/* Category + year */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.65rem',
            letterSpacing: '0.1em',
            color:         'var(--color-acid)',
          }}
        >
          {project.cat}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   '0.65rem',
            color:      'var(--color-text-faint)',
          }}
        >
          {project.year}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily:    'var(--font-heading)',
          fontWeight:    500,
          fontSize:      'clamp(1rem,2vw,1.2rem)',
          letterSpacing: '-0.015em',
          lineHeight:    1.25,
          color:         'var(--color-text)',
          margin:        0,
        }}
      >
        {project.title}
      </h3>

      {/* Desc */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize:   '0.85rem',
          color:      'var(--color-text-faint)',
          lineHeight: 1.6,
          margin:     0,
          flexGrow:   1,
        }}
      >
        {project.desc}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
        {project.tags.map((tag) => (
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

      {/* Arrow indicator */}
      <span
        className="proj-arrow"
        aria-hidden
        style={{
          position:   'absolute',
          top:        'clamp(1rem,2vw,1.5rem)',
          right:      'clamp(1rem,2vw,1.5rem)',
          fontFamily: 'var(--font-mono)',
          fontSize:   '0.8rem',
          color:      'var(--color-text-faint)',
          opacity:    0,
          transition: 'opacity 200ms, transform 200ms',
        }}
      >
        ↗
      </span>
    </article>
  )
}

/* ── Timeline item ────────────────────────────────────────────────────────── */

function TimelineItem({
  item,
  index,
}: {
  item:  typeof TIMELINE[number]
  index: number
}) {
  const isTop = item.side === 'top'

  return (
    <div
      style={{
        position:  'relative',
        textAlign: 'center',
      }}
    >
      {/* Dot on the line */}
      <div
        style={{
          position:        'absolute',
          top:             'calc(8rem - 4px)',
          left:            '50%',
          transform:       'translateX(-50%)',
          width:           '8px',
          height:          '8px',
          borderRadius:    '50%',
          background:      index === TIMELINE.length - 1 ? 'var(--color-acid)' : 'var(--color-border)',
          border:          index === TIMELINE.length - 1 ? '2px solid var(--color-acid)' : '2px solid var(--color-text-faint)',
          zIndex:          1,
        }}
      />

      {/* Vertical connector */}
      <div
        style={{
          position:   'absolute',
          left:       '50%',
          width:      '1px',
          background: 'var(--color-border)',
          ...(isTop
            ? { top: 'calc(8rem - 4rem)', height: '4rem', transform: 'translateX(-50%)' }
            : { top: '8rem',             height: '4rem', transform: 'translateX(-50%)' }),
        }}
      />

      {/* Card */}
      <div
        className="tl-card"
        data-reveal
        style={{
          position:       'relative',
          display:        'inline-flex',
          flexDirection:  'column',
          gap:            '3px',
          padding:        '0.65rem 0.6rem',
          border:         '1px solid var(--color-border)',
          borderRadius:   '2px',
          background:     'var(--color-bg)',
          textAlign:      'left',
          maxWidth:       '160px',
          marginTop:      isTop ? 0 : '12.5rem',
          transition:     'border-color 200ms',
          animationDelay: `${index * 100}ms`,
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.65rem',
            letterSpacing: '0.08em',
            color:         index === TIMELINE.length - 1 ? 'var(--color-acid)' : 'var(--color-text-faint)',
          }}
        >
          {item.period}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            fontSize:   '0.8rem',
            color:      'var(--color-text)',
            lineHeight: 1.3,
          }}
        >
          {item.role}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize:   '0.75rem',
            color:      'var(--color-text-faint)',
          }}
        >
          {item.org} · {item.loc}
        </span>
      </div>
    </div>
  )
}
