'use client'

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import * as d3 from 'd3'

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface Cluster {
  id: string
  label: string
  color: string
}

export interface Project {
  id: string
  cl: string
  year: string
  title: string
  desc: string
  tags: readonly string[]
}

/* ── Static data ────────────────────────────────────────────────────────── */

export const CLUSTERS: Cluster[] = [
  { id: 'proc', label: 'Procesos',        color: 'oklch(0.84 0.07 130)'  },
  { id: 'data', label: 'Datos & IA',      color: 'oklch(0.82 0.085 250)' },
  { id: 'auto', label: 'Automatización',  color: 'oklch(0.90 0.16 110)'  },
  { id: 'prod', label: 'Producto & UX',   color: 'oklch(0.82 0.09 40)'   },
  { id: 'vent', label: 'Emprendimiento',  color: 'oklch(0.80 0.09 350)'  },
  { id: 'des',  label: 'Diseño & 3D',     color: 'oklch(0.82 0.075 300)' },
]

export const PROJECTS: Project[] = [
  { id: 'tesis',    cl: 'proc', year: '2018',  title: 'Tesis — Fitomedicina',  desc: 'Análisis termodinámico y modelado de extracción.',          tags: ['Termodinámica', 'I+D']          },
  { id: 'nlp',      cl: 'data', year: '2019',  title: 'NLP & Sentiment',       desc: 'Twitter pre-IA, feature engineering puro.',               tags: ['NLP', 'Python']                 },
  { id: 'bigdata',  cl: 'data', year: '2020',  title: 'Big Data — Olist',      desc: 'Spark + Azure sobre dataset de e-commerce.',              tags: ['Spark', 'Azure']                },
  { id: 'uxab',     cl: 'prod', year: '2020',  title: 'UI/UX & A/B — Berlín',  desc: 'Diseño e experimentación de usuarios.',                   tags: ['UX', 'A/B Test']                },
  { id: 'uhueal',   cl: 'vent', year: '2020',  title: 'Uhueal — Founder Inst.',desc: 'Aceleración internacional, Berlín.',                       tags: ['Startup']                       },
  { id: 'segted',   cl: 'data', year: '2021',  title: 'Segmentación Telco',    desc: 'Clusters por hábitos de consumo B2B/B2C.',                tags: ['Python', 'ML']                  },
  { id: 'rpa',      cl: 'auto', year: '2021',  title: 'RPA & SET',             desc: 'Extracción tributaria SET + segmentación.',               tags: ['RPA', 'Python']                 },
  { id: 'asugreen', cl: 'data', year: '2021+', title: 'ASUGREEN',              desc: 'NDVI satélite + IoT. Google Earth Engine.',               tags: ['GEE', 'Python']                 },
  { id: 'real',     cl: 'des',  year: '2021',  title: 'Real Estate 3D',        desc: 'SketchUp + Lumion + Unreal Engine.',                      tags: ['3D', 'Unreal']                  },
  { id: 'tudu',     cl: 'prod', year: '2024',  title: 'TUDU App',              desc: 'Plataforma gig commerce para oficios.',                   tags: ['UX', 'Product']                 },
  { id: 'karu',     cl: 'vent', year: '2025',  title: 'KaruLab',               desc: 'Meal prep + plataforma nutricional B2B/B2C.',             tags: ['Expo', 'Supabase']              },
  { id: 'obras',    cl: 'prod', year: '2026',  title: 'Gestión de Obras',      desc: 'Tracking y presupuesto para constructoras.',              tags: ['Next.js', 'Supabase']           },
  { id: 'kapi',     cl: 'vent', year: '2026',  title: 'KAPI',                  desc: 'Fintech educación financiera jóvenes.',                   tags: ['Fintech', 'Next.js']            },
]

/* ── Simulation node types ──────────────────────────────────────────────── */

type NodeKind = 'hub' | 'project'

interface SimNode extends d3.SimulationNodeDatum {
  kind: NodeKind
  id: string
  clusterId?: string
  clusterColor?: string
  clusterLabel?: string
  project?: Project
  clusterColor2?: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string
  target: SimNode | string
}

/* ── Component ──────────────────────────────────────────────────────────── */

interface ProjectsGraphProps {
  onSelect: (project: Project | null) => void
  selected: Project | null
}

export default function ProjectsGraph({ onSelect, selected }: ProjectsGraphProps) {
  const svgRef     = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const simRef     = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const [ready,          setReady]          = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  const clusterColor = useCallback((id: string) =>
    CLUSTERS.find(c => c.id === id)?.color ?? '#888', [])

  /* ── Scroll progress tracker ─────────────────────────────────────────── */

  useEffect(() => {
    const rafRef = { current: 0 }

    function update() {
      const hero     = document.getElementById('hero')
      const projects = document.getElementById('projects')
      if (!hero || !projects) return

      const heroH    = hero.offsetHeight
      const heroTop  = hero.offsetTop
      const start    = heroTop + heroH * 0.25   // transition begins at 25% of hero scroll
      const end      = heroTop + heroH * 0.85   // fully interactive by 85%
      const y        = window.scrollY

      const p = Math.max(0, Math.min(1, (y - start) / (end - start)))
      setScrollProgress(p)
    }

    function onScroll() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  /* ── D3 simulation setup ─────────────────────────────────────────────── */

  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const W   = window.innerWidth
    const H   = window.innerHeight

    svg.attr('width', W).attr('height', H)
    svg.selectAll('*').remove()

    const cx  = W / 2
    const cy  = H / 2
    const hubR = Math.min(W, H) * 0.28

    const hubs: SimNode[] = CLUSTERS.map((cl, i) => {
      const angle = (i / CLUSTERS.length) * 2 * Math.PI - Math.PI / 2
      return {
        kind: 'hub',
        id: `hub_${cl.id}`,
        clusterId: cl.id,
        clusterColor: cl.color,
        clusterLabel: cl.label,
        x: cx + Math.cos(angle) * hubR,
        y: cy + Math.sin(angle) * hubR,
      }
    })

    const projectNodes: SimNode[] = PROJECTS.map((p) => ({
      kind: 'project',
      id: `proj_${p.id}`,
      project: p,
      clusterColor2: clusterColor(p.cl),
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 200,
    }))

    const nodes: SimNode[] = [...hubs, ...projectNodes]

    const links: SimLink[] = PROJECTS.map((p) => ({
      source: `hub_${p.cl}`,
      target: `proj_${p.id}`,
    }))

    const sim = d3.forceSimulation<SimNode, SimLink>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => (d.source as SimNode).kind === 'hub' ? 90 : 60)
        .strength(0.6))
      .force('charge', d3.forceManyBody<SimNode>()
        .strength(d => d.kind === 'hub' ? -280 : -120))
      .force('center', d3.forceCenter(cx, cy).strength(0.04))
      .force('collide', d3.forceCollide<SimNode>()
        .radius(d => d.kind === 'hub' ? 52 : 28)
        .strength(0.7))
      .force('bounds', () => {
        nodes.forEach(n => {
          const r = n.kind === 'hub' ? 28 : 16
          n.x = Math.max(r + 24, Math.min(W - r - 24, n.x ?? cx))
          n.y = Math.max(r + 64, Math.min(H - r - 24, n.y ?? cy))
        })
      })
      .alphaDecay(0.025)

    simRef.current = sim

    /* ── SVG layers ─────────────────────────────────────────────────────── */

    const gLinks  = svg.append('g').attr('class', 'links')
    const gNodes  = svg.append('g').attr('class', 'nodes')
    const gLabels = svg.append('g').attr('class', 'labels')

    const linkEl = gLinks
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links).enter().append('line')
      .attr('stroke', 'rgba(232,230,223,0.08)')
      .attr('stroke-width', 1)

    const hubEls = gNodes
      .selectAll<SVGCircleElement, SimNode>('.hub')
      .data(hubs).enter().append('circle')
      .attr('class', 'hub').attr('r', 28)
      .attr('fill', d => `color-mix(in srgb, ${d.clusterColor} 18%, transparent)`)
      .attr('stroke', d => d.clusterColor ?? '#888')
      .attr('stroke-width', 1.5)
      .style('cursor', 'default').style('opacity', 0)

    const projEls = gNodes
      .selectAll<SVGCircleElement, SimNode>('.proj')
      .data(projectNodes).enter().append('circle')
      .attr('class', 'proj').attr('r', 13)
      .attr('fill', d => `color-mix(in srgb, ${d.clusterColor2} 26%, transparent)`)
      .attr('stroke', d => d.clusterColor2 ?? '#888')
      .attr('stroke-width', 1.2)
      .style('cursor', 'pointer').style('opacity', 0)

    const hubLabels = gLabels
      .selectAll<SVGTextElement, SimNode>('.hub-label')
      .data(hubs).enter().append('text')
      .attr('class', 'hub-label')
      .attr('fill', d => d.clusterColor ?? '#888')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '9px').attr('letter-spacing', '0.12em')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none').style('opacity', 0)
      .text(d => (d.clusterLabel ?? '').toUpperCase())

    const projLabelGroups = gLabels
      .selectAll<SVGGElement, SimNode>('.proj-label-g')
      .data(projectNodes).enter().append('g')
      .attr('class', 'proj-label-g')
      .attr('pointer-events', 'none').style('opacity', 0)

    projLabelGroups.append('text')
      .attr('class', 'proj-label-text')
      .attr('fill', '#ece9e1')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '9px').attr('letter-spacing', '0.07em')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
      .attr('dy', '-20').text(d => d.project?.title ?? '')

    const projYearGroups = gLabels
      .selectAll<SVGGElement, SimNode>('.proj-year-g')
      .data(projectNodes).enter().append('g')
      .attr('class', 'proj-year-g')
      .attr('pointer-events', 'none').style('opacity', 0)

    projYearGroups.append('text')
      .attr('fill', '#615f58')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '8px').attr('letter-spacing', '0.05em')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'auto')
      .attr('dy', '-10').text(d => d.project?.year ?? '')

    /* ── Drag ───────────────────────────────────────────────────────────── */

    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end',   (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    hubEls.call(drag as d3.DragBehavior<SVGCircleElement, SimNode, SimNode>)
    projEls.call(drag as d3.DragBehavior<SVGCircleElement, SimNode, SimNode>)

    /* ── Hover / click ──────────────────────────────────────────────────── */

    projEls
      .on('click', (_e, d) => onSelect(d.project ?? null))
      .on('mouseenter', function(_e, d) {
        d3.select(this).transition().duration(150).attr('r', 17)
        projLabelGroups.filter(s => s.id === d.id).transition().duration(150).style('opacity', 1)
        projYearGroups.filter(s => s.id === d.id).transition().duration(150).style('opacity', 1)
      })
      .on('mouseleave', function(_e, d) {
        d3.select(this).transition().duration(150).attr('r', 13)
        if (selected?.id !== d.project?.id) {
          projLabelGroups.filter(s => s.id === d.id).transition().duration(200).style('opacity', 0)
          projYearGroups.filter(s => s.id === d.id).transition().duration(200).style('opacity', 0)
        }
      })

    /* ── Tick ───────────────────────────────────────────────────────────── */

    sim.on('tick', () => {
      linkEl
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
      hubEls.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      projEls.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      hubLabels.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)
      projLabelGroups.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      projYearGroups.attr('transform',  d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    /* ── Fade in ────────────────────────────────────────────────────────── */

    const fadeTimer = setTimeout(() => {
      hubEls.transition().duration(800).style('opacity', 1)
      projEls.transition().duration(800).delay((_d, i) => i * 40).style('opacity', 1)
      hubLabels.transition().duration(800).style('opacity', 1)
      setReady(true)
    }, 200)

    /* ── Resize ─────────────────────────────────────────────────────────── */

    function onResize() {
      const nW = window.innerWidth
      const nH = window.innerHeight
      svg.attr('width', nW).attr('height', nH)
      sim.force('center', d3.forceCenter(nW / 2, nH / 2).strength(0.04))
      sim.force('bounds', () => {
        nodes.forEach(n => {
          const r = n.kind === 'hub' ? 28 : 16
          n.x = Math.max(r + 24, Math.min(nW - r - 24, n.x ?? nW / 2))
          n.y = Math.max(r + 64, Math.min(nH - r - 24, n.y ?? nH / 2))
        })
      })
      sim.alpha(0.3).restart()
    }

    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(fadeTimer)
      sim.stop()
      simRef.current = null
      window.removeEventListener('resize', onResize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Selection highlight ────────────────────────────────────────────── */

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    if (!selected) {
      svg.selectAll<SVGCircleElement, SimNode>('.proj')
        .transition().duration(200).style('opacity', 1).attr('stroke-width', 1.2)
      svg.selectAll<SVGLineElement, SimLink>('line')
        .transition().duration(200).style('opacity', 1)
      svg.selectAll<SVGCircleElement, SimNode>('.hub')
        .transition().duration(200).style('opacity', 1)
    } else {
      svg.selectAll<SVGCircleElement, SimNode>('.proj')
        .transition().duration(200)
        .style('opacity', d => d.project?.id === selected.id ? 1 : 0.15)
        .attr('stroke-width', d => d.project?.id === selected.id ? 2.5 : 1.2)
        .attr('stroke', d =>
          d.project?.id === selected.id ? '#d6ff3f' : (d.clusterColor2 ?? '#888'))
      svg.selectAll<SVGLineElement, SimLink>('line')
        .transition().duration(200)
        .style('opacity', d => (d.target as SimNode).project?.id === selected.id ? 0.5 : 0.04)
      svg.selectAll<SVGCircleElement, SimNode>('.hub')
        .transition().duration(200)
        .style('opacity', d => d.clusterId === selected.cl ? 1 : 0.25)
    }
  }, [selected])

  /* ── Derive visual state from scrollProgress ────────────────────────── */

  // ambient  → full interactive
  // opacity: 0.25 → 1.0
  // translateX: 28% → 0%   (shifts graph to right half when ambient)
  // scale: 0.62 → 1.0
  const p      = scrollProgress
  const opacity   = ready ? (0.25 + p * 0.75) : 0
  const translateX = (1 - p) * 28    // % units
  const scale     = 0.62 + p * 0.38
  const interactive = p > 0.85

  return (
    <div
      ref={wrapperRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100vw',
        height:        '100vh',
        zIndex:        5,
        pointerEvents: interactive ? 'auto' : 'none',
        opacity,
        transform:     `translateX(${translateX}%) scale(${scale})`,
        transformOrigin: 'center center',
        willChange:    'transform, opacity',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top:      0,
          left:     0,
        }}
      />
    </div>
  )
}
