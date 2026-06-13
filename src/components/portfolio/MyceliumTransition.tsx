'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

interface Branch {
  points: { x: number; y: number }[]
  width: number
  depth: number
  angle: number
  speed: number
  children: Branch[]
  grown: boolean
}

interface MyceliumTransitionProps {
  active: boolean
  origin: { x: number; y: number }
  color: string
  onComplete: () => void
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

export default function MyceliumTransition({ active, origin, color, onComplete }: MyceliumTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const branchesRef = useRef<Branch[]>([])
  const progressRef = useRef({ value: 0 })

  const buildBranches = useCallback(() => {
    const count = 12
    const branches: Branch[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      branches.push(createBranch(origin.x, origin.y, angle, 2.5, 0))
    }
    branchesRef.current = branches
  }, [origin])

  useEffect(() => {
    if (!active || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.scale(dpr, dpr)

    const W = window.innerWidth
    const H = window.innerHeight

    buildBranches()

    // Pre-grow all branches to full extent
    for (let i = 0; i < 300; i++) {
      branchesRef.current.forEach(b => growBranch(b, W, H))
    }

    progressRef.current.value = 0

    const tween = gsap.to(progressRef.current, {
      value: 1,
      duration: 0.9,
      ease: 'power2.in',
      onUpdate: () => {
        ctx.clearRect(0, 0, W, H)

        branchesRef.current.forEach(branch => {
          drawBranch(ctx, branch, color, progressRef.current.value)
        })

        if (progressRef.current.value > 0.7) {
          const fillAlpha = (progressRef.current.value - 0.7) / 0.3
          ctx.fillStyle = `rgba(12, 12, 10, ${fillAlpha})`
          ctx.fillRect(0, 0, W, H)
        }
      },
      onComplete,
    })

    return () => {
      tween.kill()
    }
  }, [active, origin, color, onComplete, buildBranches])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    />
  )
}
