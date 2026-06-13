'use client'

import React, { useRef, useEffect, useState } from 'react'

const JOURNEY = [
  { id: 'edu1',    period: '2017–2021', type: 'EDU',  org: 'Univ. Paraguayo Alemana', role: 'Ingeniería Industrial',   loc: 'Asunción PY',   desc: 'Carrera base. Termodinámica, procesos, estadística, gestión de operaciones y proyectos industriales.' },
  { id: 'hd',      period: '2019',      type: 'EDU',  org: 'Heidelberg',               role: 'Residencia Académica',    loc: 'Heidelberg DE', desc: 'Estadía internacional en ciencias aplicadas e investigación multidisciplinaria.' },
  { id: 'sbc',     period: '2018–2019', type: 'WORK', org: 'SBC',                      role: 'Senior Project Manager',  loc: 'Asunción PY',   desc: 'Gestión de proyectos de automatización y datos B2B para clientes corporativos.' },
  { id: 'tigo',    period: '2021–2025', type: 'WORK', org: 'Tigo PRY (Millicom)',      role: 'Datos & Auto. B2B',       loc: 'Asunción PY',   desc: 'Análisis de datos, RPA, segmentación clientes, dashboards Power BI, proyectos de innovación.' },
  { id: 'ceragon', period: '2025–hoy',  type: 'WORK', org: 'Ceragon',                  role: 'PMO Manager LATAM',       loc: 'Asunción PY',   desc: 'Implementación y coordinación de proyectos de telecomunicaciones B2B en toda la región.' },
] as const

const TYPE_COLOR: Record<string, string> = {
  EDU:  'var(--color-acid, #d6ff3f)',
  WORK: 'var(--color-coral, #ff6a3d)',
}

/* ── Project milestones (below line, acid) ── */
const PROJECT_MILESTONES = [
  { id: 'nlp-m',      year: 2018, label: 'NLP & Sentiment',   xAdj:   0 },
  { id: 'uheal-m',    year: 2020, label: 'Uhueal',            xAdj:   0 },
  { id: 'prop-m',     year: 2020, label: 'PropSpace',         xAdj:   0 },
  { id: 'rutas-m',    year: 2021, label: 'Rutas Reparto',     xAdj:   0 },
  { id: 'canna-m',    year: 2021, label: 'CBD Extracción',    xAdj:   0 },
  { id: 'rpa-m',      year: 2022, label: 'Clasif. Clientes',  xAdj:   0 },
  { id: 'bigdata-m',  year: 2022, label: 'Big Data Olist',    xAdj:   0 },
  { id: 'tudu-m',     year: 2024, label: 'TUDU App',          xAdj:   0 },
  { id: 'l2o-m',      year: 2024, label: 'Lead-to-Cash',      xAdj:   0 },
  { id: 'abast-m',    year: 2024, label: 'Abastecimiento',    xAdj:   0 },
  { id: 'asugreen-m', year: 2025, label: 'ASUGREEN',          xAdj:   0 },
  { id: 'obras-m',    year: 2025, label: 'Gestión Obras',     xAdj:   0 },
  { id: 'kapi-m',     year: 2026, label: 'KAPI',              xAdj: -40 }, // antes del master
]

/* ── Certification milestones (above line, bone) ── */
const CERT_MILESTONES = [
  { id: 'goog-c',    year: 2022, label: 'Google Transformation', xAdj:   0 },
  { id: 'scrum-c',   year: 2022, label: 'Scrum Master · SA',     xAdj:   0 },
  { id: 'bigduc-c',  year: 2023, label: 'Big Data · UCOM',       xAdj:   0 },
  { id: 'etom-c',    year: 2023, label: 'eTOM Process',          xAdj:   0 },
  { id: 'gb-c',      year: 2025, label: 'Green Belt · LSSI',     xAdj:   0 },
  { id: 'master-c',  year: 2026, label: 'Master PM · OBS',       xAdj:  40 }, // después de KAPI
]

const CARD_W          = 240
const SPACING         = 520
const TRACK_PAD_LEFT  = 160
const TRACK_PAD_RIGHT = 900

/* Year → x mapping: 2017 anchors to first journey node, 2026 to NOW dot */
const YEAR_START = 2017
const YEAR_END   = 2026
const X_JOURNEY_START = TRACK_PAD_LEFT + 480                              // 640
const X_NOW           = TRACK_PAD_LEFT + 480 + 5 * SPACING + 60           // 3300

function yearToX(year: number): number {
  return X_JOURNEY_START + ((year - YEAR_START) / (YEAR_END - YEAR_START)) * (X_NOW - X_JOURNEY_START)
}

function computePositions<T extends { year: number; xAdj: number }>(items: T[]) {
  const groups: Record<number, number> = {}
  const counts: Record<number, number> = {}
  items.forEach(m => { counts[m.year] = (counts[m.year] || 0) + 1 })
  return items.map(m => {
    const idx  = groups[m.year] ?? 0
    groups[m.year] = idx + 1
    const total = counts[m.year]
    const xOff  = (idx - (total - 1) / 2) * 80   // 80px between same-year siblings
    const stemH = 22 + idx * 16                    // each sibling hangs deeper / higher
    return { ...m, x: yearToX(m.year) + xOff + m.xAdj, stemH }
  })
}

const milestonePositions = computePositions(PROJECT_MILESTONES)
const certPositions      = computePositions(CERT_MILESTONES)

export default function TimelineSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef   = useRef<HTMLDivElement>(null)
  const rafRef     = useRef<number>(0)
  const [openId,     setOpenId]     = useState<string | null>(null)
  const [translateX, setTranslateX] = useState(0)
  const [progress,   setProgress]   = useState(0)

  const trackWidth = TRACK_PAD_LEFT + 480 + JOURNEY.length * SPACING + TRACK_PAD_RIGHT

  useEffect(() => {
    const update = () => {
      const section = sectionRef.current
      if (!section) return
      const sectionTop = window.scrollY + section.getBoundingClientRect().top
      const scrollable = section.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      const p = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable))
      const maxSlide = Math.max(0, trackWidth - window.innerWidth)
      setTranslateX(-p * maxSlide)
      setProgress(p)
    }

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [trackWidth])

  const lineY = 50 // %

  return (
    <section
      ref={sectionRef}
      id="tray"
      style={{
        position:   'relative',
        height:     '1200vh',
        background: 'var(--color-bg, #0c0c0a)',
      }}
    >
      {/* Sticky viewport */}
      <div
        style={{
          position: 'sticky',
          top:      0,
          height:   '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Section scroll progress bar */}
        <div
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            width:      `${progress * 100}%`,
            height:     '1px',
            background: 'var(--color-acid, #d6ff3f)',
            opacity:    0.35,
            zIndex:     10,
            transition: 'width 60ms linear',
          }}
        />

        {/* Horizontal track */}
        <div
          ref={trackRef}
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            height:     '100vh',
            width:      trackWidth,
            transform:  `translateX(${translateX}px)`,
            transition: 'transform 0.05s linear',
            willChange: 'transform',
          }}
        >
          {/* Section header */}
          <div style={{
            position:  'absolute',
            left:      TRACK_PAD_LEFT,
            top:       '50%',
            transform: 'translateY(-50%)',
            maxWidth:  460,
          }}>
            <span style={{
              display:       'block',
              fontFamily:    'var(--font-mono, monospace)',
              fontSize:      11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         'var(--color-acid, #d6ff3f)',
              marginBottom:  14,
            }}>
              03 — TRAYECTO
            </span>
            <h2 style={{
              margin:        0,
              fontFamily:    'var(--font-heading, sans-serif)',
              fontWeight:    500,
              fontSize:      'clamp(34px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              lineHeight:    1.0,
              color:         'var(--color-text, #ece9e1)',
            }}>
              Una trayectoria,<br />un sistema.
            </h2>
            <p style={{
              margin:     '14px 0 0',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize:   15,
              color:      'var(--color-text-faint, #615f58)',
              lineHeight: 1.55,
              maxWidth:   340,
            }}>
              Cada nodo es un capítulo.<br />Cada línea, una conexión.
            </p>
          </div>

          {/* Horizontal main line */}
          <div style={{
            position:   'absolute',
            left:       0,
            right:      0,
            top:        lineY + '%',
            height:     1,
            background: 'rgba(232,230,223,0.12)',
            transform:  'translateY(-50%)',
          }} />

          {/* Tick marks */}
          {Array.from({ length: Math.floor(trackWidth / 160) }).map((_, i) => (
            <div
              key={i}
              style={{
                position:   'absolute',
                left:       i * 160 + TRACK_PAD_LEFT,
                top:        lineY + '%',
                transform:  'translate(-50%, -50%)',
                width:      1,
                height:     i % 5 === 0 ? 12 : 6,
                background: 'rgba(232,230,223,0.08)',
              }}
            />
          ))}

          {/* ── Project milestone dots ── */}
          {milestonePositions.map((m) => (
            <div key={m.id}>
              {/* Stem below line */}
              <div style={{
                position:  'absolute',
                left:      m.x,
                top:       lineY + '%',
                width:     1,
                height:    m.stemH,
                background:'rgba(214,255,63,0.15)',
                transform: 'translateX(-50%)',
              }} />
              {/* Dot */}
              <div style={{
                position:     'absolute',
                left:         m.x,
                top:          `calc(${lineY}% + ${m.stemH}px)`,
                transform:    'translate(-50%, 0)',
                width:        6,
                height:       6,
                borderRadius: '50%',
                background:   'rgba(214,255,63,0.25)',
                border:       '1px solid rgba(214,255,63,0.4)',
              }} />
              {/* Label */}
              <div style={{
                position:      'absolute',
                left:          m.x,
                top:           `calc(${lineY}% + ${m.stemH + 10}px)`,
                transform:     'translateX(-50%)',
                fontFamily:    'var(--font-mono, monospace)',
                fontSize:      8,
                letterSpacing: '0.06em',
                color:         'rgba(214,255,63,0.35)',
                whiteSpace:    'nowrap',
                textAlign:     'center',
              }}>
                {m.label}
              </div>
            </div>
          ))}

          {/* ── Certification milestones (above line, bone) ── */}
          {certPositions.map((m) => (
            <div key={m.id}>
              {/* Stem above line */}
              <div style={{
                position:  'absolute',
                left:      m.x,
                top:       `calc(${lineY}% - ${m.stemH}px)`,
                width:     1,
                height:    m.stemH,
                background:'rgba(236,233,225,0.12)',
                transform: 'translateX(-50%)',
              }} />
              {/* Dot */}
              <div style={{
                position:     'absolute',
                left:         m.x,
                top:          `calc(${lineY}% - ${m.stemH}px)`,
                transform:    'translate(-50%, -50%)',
                width:        6,
                height:       6,
                borderRadius: '50%',
                background:   'rgba(236,233,225,0.18)',
                border:       '1px solid rgba(236,233,225,0.35)',
              }} />
              {/* Label */}
              <div style={{
                position:      'absolute',
                left:          m.x,
                top:           `calc(${lineY}% - ${m.stemH + 12}px)`,
                transform:     'translate(-50%, -100%)',
                fontFamily:    'var(--font-mono, monospace)',
                fontSize:      8,
                letterSpacing: '0.06em',
                color:         'rgba(236,233,225,0.3)',
                whiteSpace:    'nowrap',
                textAlign:     'center',
              }}>
                {m.label}
              </div>
            </div>
          ))}

          {/* ── Journey nodes ── */}
          {JOURNEY.map((item, i) => {
            const x      = TRACK_PAD_LEFT + 480 + i * SPACING
            const isTop  = i % 2 === 0
            const color  = TYPE_COLOR[item.type] || '#d6ff3f'
            const isOpen = openId === item.id
            const isLast = i === JOURNEY.length - 1

            return (
              <div key={item.id}>
                {/* Dot on line */}
                <div
                  style={{
                    position:     'absolute',
                    left:         x,
                    top:          lineY + '%',
                    transform:    'translate(-50%, -50%)',
                    width:        isLast ? 16 : 13,
                    height:       isLast ? 16 : 13,
                    borderRadius: '50%',
                    background:   isLast ? color : 'var(--color-bg, #0c0c0a)',
                    border:       `1.5px solid ${color}`,
                    boxShadow:    isLast ? `0 0 12px ${color}60` : 'none',
                    cursor:       'pointer',
                    zIndex:       2,
                    transition:   'transform 0.2s',
                  }}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1.4)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1)')}
                />

                {/* Stem */}
                <div style={{
                  position:  'absolute',
                  left:      x,
                  top:       isTop ? (lineY + '%') : ('calc(' + lineY + '% + 6px)'),
                  width:     1,
                  height:    80,
                  background:'rgba(232,230,223,0.12)',
                  transform: isTop ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%)',
                }} />

                {/* Period label */}
                <div style={{
                  position:      'absolute',
                  left:          x,
                  top:           lineY + '%',
                  transform:     isTop ? 'translate(-50%, 14px)' : 'translate(-50%, -26px)',
                  fontFamily:    'var(--font-mono, monospace)',
                  fontSize:      10,
                  letterSpacing: '0.1em',
                  color:         'var(--color-text-faint, #615f58)',
                  whiteSpace:    'nowrap',
                }}>
                  {item.period}
                </div>

                {/* Card */}
                <div
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  style={{
                    position:   'absolute',
                    left:       x - CARD_W / 2,
                    top:        isTop
                      ? ('calc(' + lineY + '% - 96px - ' + CARD_W * 0.52 + 'px)')
                      : ('calc(' + lineY + '% + 96px)'),
                    width:      CARD_W,
                    background: '#131311',
                    border:     `1px solid ${isOpen ? color : 'rgba(232,230,223,0.08)'}`,
                    borderRadius: 4,
                    padding:    '14px 16px',
                    cursor:     'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = color
                    const org = el.querySelector<HTMLElement>('.org-name')
                    if (org) org.style.color = color
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = isOpen ? color : 'rgba(232,230,223,0.08)'
                    const org = el.querySelector<HTMLElement>('.org-name')
                    if (org) org.style.color = 'var(--color-text, #ece9e1)'
                  }}
                >
                  <span style={{
                    display:       'block',
                    fontFamily:    'var(--font-mono, monospace)',
                    fontSize:      9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color,
                    marginBottom:  6,
                  }}>
                    {item.type}
                  </span>
                  <span className="org-name" style={{
                    display:       'block',
                    fontFamily:    'var(--font-heading, sans-serif)',
                    fontWeight:    500,
                    fontSize:      17,
                    letterSpacing: '-0.01em',
                    color:         'var(--color-text, #ece9e1)',
                    lineHeight:    1.1,
                    marginBottom:  4,
                    transition:    'color 0.2s',
                  }}>
                    {item.org}
                  </span>
                  <span style={{
                    display:       'block',
                    fontFamily:    'var(--font-mono, monospace)',
                    fontSize:      10,
                    letterSpacing: '0.05em',
                    color:         'var(--color-text-faint, #615f58)',
                    marginBottom:  2,
                  }}>
                    {item.role}
                  </span>
                  <span style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        5,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize:   9,
                    letterSpacing: '0.08em',
                    color:      'rgba(97,95,88,0.7)',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                    {item.loc}
                  </span>
                  <div style={{ maxHeight: isOpen ? 120 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                    <p style={{
                      margin:     '10px 0 0',
                      fontFamily: 'var(--font-body, sans-serif)',
                      fontSize:   13,
                      lineHeight: 1.55,
                      color:      'var(--color-text-faint, #615f58)',
                    }}>
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Mid-journey annotation */}
                {i < JOURNEY.length - 1 && (
                  <div style={{
                    position:      'absolute',
                    left:          x + SPACING * 0.45,
                    top:           lineY + '%',
                    transform:     'translate(-50%, -28px)',
                    fontFamily:    'var(--font-mono, monospace)',
                    fontSize:      9,
                    letterSpacing: '0.1em',
                    color:         'rgba(97,95,88,0.35)',
                    whiteSpace:    'nowrap',
                    textTransform: 'uppercase',
                  }}>
                    {i === 0 && '↗ primer salto internacional'}
                    {i === 1 && '↗ entrada al mundo corporativo'}
                    {i === 2 && '→ telecom & datos B2B'}
                    {i === 3 && '→ LATAM scale'}
                  </div>
                )}
              </div>
            )
          })}

          {/* Contact CTA */}
          <div
            id="contact"
            style={{
              position:  'absolute',
              left:      TRACK_PAD_LEFT + 480 + JOURNEY.length * SPACING + 160,
              top:       '50%',
              transform: 'translateY(-50%)',
              maxWidth:  420,
            }}
          >
            <span style={{
              display:       'block',
              fontFamily:    'var(--font-mono, monospace)',
              fontSize:      11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         'var(--color-text-faint, #615f58)',
              marginBottom:  16,
            }}>
              04 — CONTACTO
            </span>
            <h2 style={{
              margin:        0,
              fontFamily:    'var(--font-heading, sans-serif)',
              fontWeight:    500,
              fontSize:      'clamp(34px, 4vw, 50px)',
              lineHeight:    1.02,
              letterSpacing: '-0.025em',
              color:         'var(--color-text, #ece9e1)',
            }}>
              ¿Trabajamos<br />
              <span style={{ color: 'var(--color-acid, #d6ff3f)' }}>juntos?</span>
            </h2>
            <p style={{
              margin:     '12px 0 0',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize:   14,
              lineHeight: 1.6,
              color:      'var(--color-text-faint, #615f58)',
              maxWidth:   360,
            }}>
              Si estás interesado en una consultoría externa de procesos, automatización o en desarrollar tu startup, contáctame.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
              <a
                href="https://wa.me/595985177770"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            8,
                  fontFamily:     'var(--font-mono, monospace)',
                  fontSize:       11,
                  letterSpacing:  '0.1em',
                  textTransform:  'uppercase',
                  padding:        '11px 20px',
                  background:     'var(--color-acid, #d6ff3f)',
                  color:          'var(--color-bg, #0c0c0a)',
                  borderRadius:   999,
                  textDecoration: 'none',
                  fontWeight:     700,
                  transition:     'filter 0.2s',
                }}
              >
                WhatsApp
              </a>
              <a
                href="https://www.linkedin.com/in/alambenitez/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            8,
                  fontFamily:     'var(--font-mono, monospace)',
                  fontSize:       11,
                  letterSpacing:  '0.1em',
                  textTransform:  'uppercase',
                  padding:        '11px 20px',
                  border:         '1px solid rgba(232,230,223,0.2)',
                  color:          'var(--color-text-faint, #615f58)',
                  borderRadius:   999,
                  textDecoration: 'none',
                  transition:     'border-color 0.2s, color 0.2s',
                }}
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position:      'absolute',
          bottom:        32,
          left:          '50%',
          transform:     'translateX(-50%)',
          fontFamily:    'var(--font-mono, monospace)',
          fontSize:      10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         'var(--color-text-faint, #615f58)',
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          opacity:       translateX < -20 ? 0 : 1,
          transition:    'opacity 0.4s',
          pointerEvents: 'none',
        }}>
          <span>scroll para explorar</span>
          <span style={{ fontSize: 14 }}>→</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0   rgba(255,106,61,0.6); }
          70%  { box-shadow: 0 0 0 12px rgba(255,106,61,0);   }
          100% { box-shadow: 0 0 0 0   rgba(255,106,61,0);   }
        }
      `}</style>
    </section>
  )
}
