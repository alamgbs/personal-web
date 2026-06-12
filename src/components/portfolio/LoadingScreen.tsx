'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const container = containerRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cubeSize = 32
    const gap = 2
    const step = cubeSize + gap
    const cols = Math.ceil(vw / step) + 2
    const rows = Math.ceil(vh / step) + 2

    // Build cube grid
    const fragment = document.createDocumentFragment()
    const cubes: HTMLElement[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cube = document.createElement('div')
        cube.style.cssText = `
          position: absolute;
          width: ${cubeSize}px;
          height: ${cubeSize}px;
          left: ${c * step - step}px;
          top: ${r * step - step}px;
          transform-style: preserve-3d;
          transform: rotateX(0deg) rotateY(0deg) scale(1);
          opacity: 1;
        `

        // Front face
        const front = document.createElement('div')
        front.style.cssText = `
          position: absolute;
          inset: 0;
          background: rgba(214,255,63,0.02);
          border: 1px solid rgba(214,255,63,0.12);
          box-shadow: 0 0 6px rgba(214,255,63,0.06), inset 0 0 8px rgba(214,255,63,0.02);
        `

        // Right face (3D depth illusion)
        const right = document.createElement('div')
        right.style.cssText = `
          position: absolute;
          width: 6px;
          height: ${cubeSize}px;
          top: 0;
          right: -6px;
          background: rgba(214,255,63,0.04);
          border: 1px solid rgba(214,255,63,0.06);
          transform: skewY(-45deg) translateY(-3px);
          transform-origin: left top;
        `

        // Bottom face (3D depth illusion)
        const bottom = document.createElement('div')
        bottom.style.cssText = `
          position: absolute;
          width: ${cubeSize}px;
          height: 6px;
          bottom: -6px;
          left: 0;
          background: rgba(214,255,63,0.03);
          border: 1px solid rgba(214,255,63,0.05);
          transform: skewX(-45deg) translateX(3px);
          transform-origin: left top;
        `

        cube.appendChild(front)
        cube.appendChild(right)
        cube.appendChild(bottom)
        fragment.appendChild(cube)
        cubes.push(cube)
      }
    }

    container.appendChild(fragment)

    // GSAP timeline
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(container, {
          opacity: 0,
          duration: 0.3,
          onComplete,
        })
      },
    })

    // Hold briefly so it's visible
    tl.to({}, { duration: 0.6 })

    // Wave dissolve from center outward
    tl.to(cubes, {
      rotateX: () => gsap.utils.random(-60, 60),
      rotateY: () => gsap.utils.random(-60, 60),
      scale: () => gsap.utils.random(1.1, 1.6),
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
      stagger: {
        from: 'center',
        grid: [rows, cols],
        amount: 1.0,
        ease: 'power1.in',
      },
    })

    return () => {
      tl.kill()
    }
  }, [mounted, onComplete])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0c0c0a',
        zIndex: 9999,
        overflow: 'hidden',
        perspective: '600px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Center glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40vw',
          height: '40vh',
          background: 'radial-gradient(ellipse, rgba(214,255,63,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {/* Monogram */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            color: 'rgba(214,255,63,0.5)',
            textTransform: 'uppercase',
          }}
        >
          AB · 2026
        </div>
      </div>
    </div>
  )
}
