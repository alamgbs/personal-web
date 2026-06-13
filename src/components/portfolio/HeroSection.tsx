'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CLUSTERS } from '@/data/projects'

gsap.registerPlugin(ScrollTrigger)

type Lang = 'es' | 'en'

interface HeroSectionProps {
  lang: Lang
  t: {
    name: string
    descriptor: string
    sub: string
    estado_k: string
    estado_v: string
    rol_k: string
    rol_v: string
    ubicacion_k: string
    ubicacion_v: string
  }
}

export default function HeroSection({ lang, t }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null)
  const keywordsRef = useRef<HTMLDivElement>(null)

  // Keyword morph animation — keywords fly to become category labels in the grid
  useEffect(() => {
    if (!heroRef.current || !keywordsRef.current) return

    const keywords = keywordsRef.current.querySelectorAll<HTMLElement>('.hero-keyword')
    const heroContent = heroRef.current.querySelector<HTMLElement>('.hero-content')

    if (!keywords.length || !heroContent) return

    // Fade out hero content on scroll
    gsap.to(heroContent, {
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'bottom 90%',
        end: 'bottom 40%',
        scrub: 0.5,
      },
      opacity: 0,
      y: -30,
    })

    // Animate each keyword to its corresponding category label in the grid
    keywords.forEach((kw) => {
      const clusterId = kw.dataset.cluster
      if (!clusterId) return

      const targetLabel = document.querySelector<HTMLElement>(
        `.category-label[data-cluster="${clusterId}"]`
      )

      if (targetLabel) {
        ScrollTrigger.create({
          trigger: heroRef.current,
          start: 'bottom 80%',
          end: 'bottom 20%',
          scrub: 0.6,
          onUpdate: (self) => {
            const progress = self.progress
            const kwRect = kw.parentElement!.getBoundingClientRect()
            const targetRect = targetLabel.getBoundingClientRect()

            const x = (targetRect.left - kwRect.left) * progress
            const y = (targetRect.top - kwRect.top) * progress

            gsap.set(kw, {
              x,
              y,
              opacity: 1 - progress * 0.5,
            })
          },
        })
      }
    })

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  return (
    <section
      id="hero"
      ref={heroRef}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'calc(56px + clamp(3rem,8vh,6rem)) clamp(1.5rem,4vw,3rem) clamp(3rem,6vh,5rem)',
        overflow: 'hidden',
      }}
    >
      <TickMark pos="tl" />
      <TickMark pos="br" />

      <div className="hero-content" style={{ maxWidth: 'min(64ch, 70vw)', position: 'relative', zIndex: 2 }}>
        {/* Kicker */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: 'clamp(2rem,4vh,3rem)',
          }}
        >
          <span style={{ display: 'block', width: '2rem', height: '1px', background: 'var(--color-acid)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--color-acid)' }}>
            PORTFOLIO — 2026
          </span>
        </div>

        {/* Name */}
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            fontSize: 'clamp(3rem, 6vw, 6.5rem)',
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            margin: 0,
            marginBottom: '1.25rem',
            color: 'var(--color-text)',
          }}
        >
          {t.name}
        </h1>

        {/* Descriptor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: 'clamp(1.5rem,3vh,2.5rem)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              color: 'var(--color-acid)',
            }}
          >
            {t.descriptor}
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(0.9rem, 1.3vw, 1.05rem)',
            color: 'var(--color-text-faint)',
            lineHeight: 1.7,
            maxWidth: '46ch',
            margin: 0,
          }}
        >
          {t.sub}
        </p>

        {/* Meta cells */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0 0',
            marginTop: 'clamp(2.5rem,5vh,4rem)',
          }}
        >
          {[
            { k: t.estado_k, v: t.estado_v, dot: true },
            { k: t.rol_k, v: t.rol_v, dot: false },
            { k: t.ubicacion_k, v: t.ubicacion_v, dot: false },
          ].map(({ k, v, dot }) => (
            <div
              key={k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '0.65rem 1.1rem',
                borderRight: '1px solid var(--color-border)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--color-text-faint)' }}>
                {k}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4em' }}>
                {dot && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--color-coral)',
                      flexShrink: 0,
                      animation: 'live-pulse 2s ease-in-out infinite',
                    }}
                  />
                )}
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category keywords — morph into grid category labels on scroll */}
      <div
        ref={keywordsRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: 'clamp(3rem,6vh,5rem)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {CLUSTERS.map((cluster) => (
          <span
            key={cluster.id}
            className="hero-keyword"
            data-cluster={cluster.id}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              color: cluster.color,
              border: `1px solid ${cluster.color}`,
              padding: '0.4rem 0.8rem',
              willChange: 'transform, opacity',
            }}
          >
            {cluster.label.toUpperCase()}
          </span>
        ))}
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 'clamp(2rem,4vh,3rem)',
          right: 'clamp(1.5rem,4vw,3rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--color-text-faint)', writingMode: 'vertical-rl' }}>
          scroll
        </span>
        <span style={{ width: '1px', height: '48px', background: 'linear-gradient(to bottom, var(--color-text-faint), transparent)', animation: 'scroll-bar 1.8s ease-in-out infinite' }} />
      </div>
    </section>
  )
}

/* ── TickMark sub-component ─────────────────────────────────────────── */

function TickMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 10
  const thick = 1
  const color = 'var(--color-border)'
  const base: React.CSSProperties = { position: 'absolute', width: `${size}px`, height: `${size}px`, pointerEvents: 'none' }
  const corners: Record<string, React.CSSProperties> = {
    tl: { top: 0, left: 0, borderTop: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    tr: { top: 0, right: 0, borderTop: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
    bl: { bottom: 0, left: 0, borderBottom: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    br: { bottom: 0, right: 0, borderBottom: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
  }
  return <span aria-hidden style={{ ...base, ...corners[pos] }} />
}
