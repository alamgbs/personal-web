'use client'

import React, { useRef, useEffect, useState } from 'react'

const JOURNEY = [
  { id: 'edu1',    period: '2013–2018', type: 'EDU',  org: 'FIUNA',           role: 'Ingeniería Industrial',   loc: 'Asunción PY',  desc: 'Carrera base. Termodinámica, procesos, estadística, gestión de operaciones y proyectos industriales.' },
  { id: 'hd',      period: '2019',      type: 'EDU',  org: 'Heidelberg',      role: 'Residencia Académica',     loc: 'Heidelberg DE', desc: 'Estadía internacional en ciencias aplicadas e investigación multidisciplinaria.' },
  { id: 'sbc',     period: '2021',      type: 'WORK', org: 'SBC',             role: 'Senior Project Manager',   loc: 'Asunción PY',  desc: 'Gestión de proyectos de automatización y datos B2B para clientes corporativos.' },
  { id: 'tigo',    period: '2021–2024', type: 'WORK', org: 'Millicom · Tigo', role: 'Datos & Auto. B2B',        loc: 'Asunción PY',  desc: 'Análisis de datos, RPA, segmentación clientes, dashboards Power BI, proyectos de innovación.' },
  { id: 'ceragon', period: '2025–now',  type: 'WORK', org: 'Ceragon',         role: 'B2B Telecom',              loc: 'Asunción PY',  desc: 'PMO Manager LATAM. Implementación y coordinación de proyectos de telecomunicaciones B2B.' },
] as const

type JourneyItem = typeof JOURNEY[number]

const TYPE_COLOR: Record<string, string> = {
  EDU: 'var(--color-acid, #d6ff3f)',
  WORK: 'var(--color-coral, #ff6a3d)',
}

const CARD_W = 220
const SPACING = 280
const TRACK_PAD_LEFT = 120
const TRACK_PAD_RIGHT = 480

export default function TimelineSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [translateX, setTranslateX] = useState(0)

  const trackWidth = TRACK_PAD_LEFT + JOURNEY.length * SPACING + TRACK_PAD_RIGHT

  useEffect(() => {
    const update = () => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const sectionTop = window.scrollY + rect.top
      const sectionH = section.offsetHeight
      const vH = window.innerHeight
      const scrollable = sectionH - vH
      if (scrollable <= 0) return
      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable))
      const maxSlide = Math.max(0, trackWidth - window.innerWidth)
      setTranslateX(-progress * maxSlide)
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

  const lineY = 50 // % — center

  return (
    <section
      ref={sectionRef}
      id="tray"
      style={{
        position: 'relative',
        height: '400vh',
        background: 'var(--color-bg, #0c0c0a)',
      }}
    >
      {/* Sticky viewport */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Horizontal track */}
        <div
          ref={trackRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100vh',
            width: trackWidth,
            transform: `translateX(${translateX}px)`,
            transition: 'transform 0.05s linear',
            willChange: 'transform',
          }}
        >
          {/* Section header */}
          <div style={{
            position: 'absolute',
            left: TRACK_PAD_LEFT,
            top: '50%',
            transform: 'translateY(-50%)',
            maxWidth: 420,
          }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-acid, #d6ff3f)',
              marginBottom: 14,
            }}>03 — TRAYECTO</span>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-heading, sans-serif)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              color: 'var(--color-text, #ece9e1)',
            }}>Una trayectoria,<br />un sistema.</h2>
            <p style={{
              margin: '14px 0 0',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: 15,
              color: 'var(--color-text-faint, #615f58)',
              lineHeight: 1.55,
              maxWidth: 340,
            }}>Cada nodo es un capítulo.<br />Cada línea, una conexión.</p>
          </div>

          {/* Horizontal main line */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: lineY + '%',
            height: 1,
            background: 'rgba(232,230,223,0.18)',
            transform: 'translateY(-50%)',
          }} />

          {/* Journey nodes */}
          {JOURNEY.map((item, i) => {
            const x = TRACK_PAD_LEFT + 400 + i * SPACING
            const isTop = i % 2 === 0
            const color = TYPE_COLOR[item.type] || '#d6ff3f'
            const isOpen = openId === item.id

            return (
              <div key={item.id}>
                {/* Dot on line */}
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: lineY + '%',
                    transform: 'translate(-50%, -50%)',
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    background: 'var(--color-bg, #0c0c0a)',
                    border: `1.5px solid ${color}`,
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1.4)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1)')}
                />

                {/* Stem */}
                <div style={{
                  position: 'absolute',
                  left: x,
                  top: isTop ? (lineY + '%') : 'calc(' + lineY + '% + 6px)',
                  width: 1,
                  height: 66,
                  background: 'rgba(232,230,223,0.15)',
                  transform: isTop ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%)',
                }} />

                {/* Period label */}
                <div style={{
                  position: 'absolute',
                  left: x,
                  top: lineY + '%',
                  transform: isTop
                    ? 'translate(-50%, 10px)'
                    : 'translate(-50%, -22px)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--color-text-faint, #615f58)',
                  whiteSpace: 'nowrap',
                }}>
                  {item.period}
                </div>

                {/* Card */}
                <div
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  style={{
                    position: 'absolute',
                    left: x - CARD_W / 2,
                    top: isTop
                      ? 'calc(' + lineY + '% - 80px - ' + CARD_W * 0.6 + 'px)'
                      : 'calc(' + lineY + '% + 80px)',
                    width: CARD_W,
                    background: '#131311',
                    border: `1px solid ${isOpen ? color : 'rgba(232,230,223,0.1)'}`,
                    borderRadius: 4,
                    padding: '14px 16px',
                    cursor: 'pointer',
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
                    el.style.borderColor = isOpen ? color : 'rgba(232,230,223,0.1)'
                    const org = el.querySelector<HTMLElement>('.org-name')
                    if (org) org.style.color = 'var(--color-text, #ece9e1)'
                  }}
                >
                  <span style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color,
                    marginBottom: 6,
                  }}>{item.type}</span>
                  <span className="org-name" style={{
                    display: 'block',
                    fontFamily: 'var(--font-heading, sans-serif)',
                    fontWeight: 500,
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    color: 'var(--color-text, #ece9e1)',
                    lineHeight: 1.1,
                    marginBottom: 4,
                    transition: 'color 0.2s',
                  }}>{item.org}</span>
                  <span style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-faint, #615f58)',
                    marginBottom: 2,
                  }}>{item.role}</span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    color: 'rgba(97,95,88,0.7)',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                    {item.loc}
                  </span>

                  {/* Expandable desc */}
                  <div style={{
                    maxHeight: isOpen ? 120 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}>
                    <p style={{
                      margin: '10px 0 0',
                      fontFamily: 'var(--font-body, sans-serif)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--color-text-faint, #615f58)',
                    }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* NOW node */}
          <div style={{
            position: 'absolute',
            left: TRACK_PAD_LEFT + 400 + JOURNEY.length * SPACING + 40,
            top: lineY + '%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--color-coral, #ff6a3d)',
              boxShadow: '0 0 0 0 rgba(255,106,61,0.5)',
              animation: 'pulse 2.4s ease-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-coral, #ff6a3d)',
            }}>AHORA</span>
          </div>

          {/* End CTA */}
          <div style={{
            position: 'absolute',
            left: TRACK_PAD_LEFT + 400 + JOURNEY.length * SPACING + 120,
            top: '50%',
            transform: 'translateY(-50%)',
            maxWidth: 360,
          }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint, #615f58)',
              marginBottom: 16,
            }}>04 — CONTACTO</span>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-heading, sans-serif)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 4vw, 50px)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              color: 'var(--color-text, #ece9e1)',
            }}>¿Trabajamos<br /><span style={{ color: 'var(--color-acid, #d6ff3f)' }}>juntos?</span></h2>
            <p style={{
              fontSize: 15,
              color: 'var(--color-text-faint, #615f58)',
              lineHeight: 1.6,
              margin: '18px 0 28px',
              maxWidth: 320,
            }}>Abierto a consulting externo, proyectos de producto y colaboraciones sistémicas.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a href="mailto:hola@alambenitez.com" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '11px 18px',
                background: 'var(--color-acid, #d6ff3f)',
                color: 'var(--color-bg, #0c0c0a)',
                borderRadius: 999,
                textDecoration: 'none',
                transition: 'filter 0.2s',
              }}>hola@alambenitez.com</a>
              <a href="https://github.com/alamgbs" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '11px 18px',
                border: '1px solid rgba(232,230,223,0.15)',
                color: 'var(--color-text-faint, #615f58)',
                borderRadius: 999,
                textDecoration: 'none',
                transition: 'border-color 0.2s, color 0.2s',
              }}>GitHub</a>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-text-faint, #615f58)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: translateX < -20 ? 0 : 1,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
        }}>
          <span>scroll para explorar</span>
          <span style={{ fontSize: 14 }}>→</span>
        </div>
      </div>
    </section>
  )
}
