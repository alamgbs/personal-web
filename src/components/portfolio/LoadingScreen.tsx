'use client'

import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

interface LoadingScreenProps {
  onComplete: () => void
}

interface Branch {
  points: { x: number; y: number }[]
  width: number
  depth: number
  angle: number
  speed: number
  children: Branch[]
  grown: boolean
}

function createBranch(x: number, y: number, angle: number, width: number, depth: number): Branch {
  return {
    points: [{ x, y }],
    width,
    depth,
    angle,
    speed: 3 + Math.random() * 4,
    children: [],
    grown: false,
  }
}

function growBranch(branch: Branch, canvasW: number, canvasH: number): boolean {
  if (branch.grown) return false

  const last = branch.points[branch.points.length - 1]

  const wobble = (Math.random() - 0.5) * 0.3
  branch.angle += wobble
  const nx = last.x + Math.cos(branch.angle) * branch.speed
  const ny = last.y + Math.sin(branch.angle) * branch.speed

  branch.points.push({ x: nx, y: ny })

  const margin = 50
  if (nx < -margin || nx > canvasW + margin || ny < -margin || ny > canvasH + margin) {
    branch.grown = true
    return false
  }

  if (branch.depth < 6 && branch.points.length > 8 && Math.random() < 0.04 * (1 - branch.depth * 0.12)) {
    const forkAngle = branch.angle + (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8)
    branch.children.push(
      createBranch(nx, ny, forkAngle, branch.width * 0.7, branch.depth + 1)
    )
  }

  branch.children.forEach(child => growBranch(child, canvasW, canvasH))
  return true
}

function drawBranch(ctx: CanvasRenderingContext2D, branch: Branch, color: string, progress: number) {
  const pointCount = Math.floor(branch.points.length * progress)
  if (pointCount < 2) return

  ctx.beginPath()
  ctx.moveTo(branch.points[0].x, branch.points[0].y)
  for (let i = 1; i < pointCount; i++) {
    ctx.lineTo(branch.points[i].x, branch.points[i].y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = branch.width * (1 - branch.depth * 0.1)
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.6 + 0.4 * (1 - branch.depth * 0.15)
  ctx.stroke()
  ctx.globalAlpha = 1

  branch.children.forEach(child => drawBranch(ctx, child, color, progress))
}

const ACID = '#d6ff3f'

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const branchesRef = useRef<Branch[]>([])
  const progressRef = useRef({ value: 0 })

  const buildBranches = useCallback((ox: number, oy: number) => {
    const count = 14
    const branches: Branch[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      branches.push(createBranch(ox, oy, angle, 2.2, 0))
    }
    branchesRef.current = branches
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight

    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(dpr, dpr)

    const ox = W / 2
    const oy = H / 2

    buildBranches(ox, oy)

    // Pre-grow all branches to full extent
    for (let i = 0; i < 300; i++) {
      branchesRef.current.forEach(b => growBranch(b, W, H))
    }

    progressRef.current.value = 0

    const tween = gsap.to(progressRef.current, {
      value: 1,
      duration: 1.1,
      ease: 'power2.inOut',
      onUpdate: () => {
        ctx.clearRect(0, 0, W, H)
        branchesRef.current.forEach(branch => {
          drawBranch(ctx, branch, ACID, progressRef.current.value)
        })
      },
      onComplete: () => {
        // Fade out the whole loading screen
        gsap.to(container, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete,
        })
      },
    })

    return () => {
      tween.kill()
    }
  }, [buildBranches, onComplete])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0c0c0a',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
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
