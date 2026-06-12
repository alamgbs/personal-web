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
  { id: 'tesis',   cl: 'proc', year: '2018',  title: 'Tesis — Fitomedicina',  desc: 'Análisis termodinámico y modelado de extracción.',          tags: ['Termodinámica', 'I+D']          },
  { id: 'nlp',     cl: 'data', year: '2019',  title: 'NLP & Sentiment',       desc: 'Twitter pre-IA, feature engineering puro.',               tags: ['NLP', 'Python']                 },
  { id: 'bigdata', cl: 'data', year: '2020',  title: 'Big Data — Olist',      desc: 'Spark + Azure sobre dataset de e-commerce.',              tags: ['Spark', 'Azure']                },
  { id: 'uxab',    cl: 'prod', year: '2020',  title: 'UI/UX & A/B — Berlín',  desc: 'Diseño e experimentación de usuarios.',                   tags: ['UX', 'A/B Test']                },
  { id: 'uhueal',  cl: 'vent', year: '2020',  title: 'Uhueal — Founder Inst.',desc: 'Aceleración internacional, Berlín.',                       tags: ['Startup']                       },
  { id: 'segted',  cl: 'data', year: '2021',  title: 'Segmentación Telco',    desc: 'Clusters por hábitos de consumo B2B/B2C.',                tags: ['Python', 'ML']                  },
  { id: 'rpa',     cl: 'auto', year: '2021',  title: 'RPA & SET',             desc: 'Extracción tributaria SET + segmentación.',               tags: ['RPA', 'Python']                 },
  { id: 'asugreen',cl: 'data', year: '2021+', title: 'ASUGREEN',              desc: 'NDVI satélite + IoT. Google Earth Engine.',               tags: ['GEE', 'Python']                 },
  { id: 'real',    cl: 'des',  year: '2021',  title: 'Real Estate 3D',        desc: 'SketchUp + Lumion + Unreal Engine.',                      tags: ['3D', 'Unreal']                  },
  { id: 'tudu',    cl: 'prod', year: '2024',  title: 'TUDU App',              desc: 'Plataforma gig commerce para oficios.',                   tags: ['UX', 'Product']                 },
  { id: 'karu',    cl: 'vent', year: '2025',  title: 'KaruLab',               desc: 'Meal prep + plataforma nutricional B2B/B2C.',             tags: ['Expo', 'Supabase']              },
  { id: 'obras',   cl: 'prod', year: '2026',  title: 'Gestión de Obras',      desc: 'Tracking y presupuesto para constructoras.',              tags: ['Next.js', 'Supabase']           },
  { id: 'kapi',    cl: 'vent', year: '2026',  title: 'KAPI',                  desc: 'Fintech educación financiera jóvenes.',                   tags: ['Fintech', 'Next.js']            },
]

/* ── Simulation node types ──────────────────────────────────────────────── */

type NodeKind = 'hub' | 'project'

interface SimNode extends d3.SimulationNodeDatum {
  kind: NodeKind
  id: string
  // hub-only
  clusterId?: string
  clusterColor?: string
  clusterLabel?: string
  // project-only
  project?: Project
  clusterColor2?: string   // same as hub color for project nodes
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
  const svgRef   = useRef<SVGSVGElement>(null)
  const simRef   = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const [ready, setReady] = useState(false)

  /* helper: cluster color by id */
  const clusterColor = useCallback((id: string) =>
    CLUSTERS.find(c => c.id === id)?.color ?? '#888', [])

  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const W   = window.innerWidth
    const H   = window.innerHeight

    svg.attr('width', W).attr('height', H)

    /* Clear on re-mount */
    svg.selectAll('*').remove()

    /* ── Build nodes & links ───────────────────────────────────────────── */

    // Angular cluster hub positions so they spread nicely
    const cx = W / 2
    const cy = H / 2
    const hubR = Math.min(W, H) * 0.28   // hub ring radius

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
        fx: undefined,  // will release after init tick
        fy: undefined,
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

    /* ── Simulation ────────────────────────────────────────────────────── */

    const sim = d3.forceSimulation<SimNode, SimLink>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => {
          const src = d.source as SimNode
          return src.kind === 'hub' ? 90 : 60
        })
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

    /* ── SVG layers ────────────────────────────────────────────────────── */

    const gLinks  = svg.append('g').attr('class', 'links')
    const gNodes  = svg.append('g').attr('class', 'nodes')
    const gLabels = svg.append('g').attr('class', 'labels')

    /* ── Links ─────────────────────────────────────────────────────────── */

    const linkEl = gLinks
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(232,230,223,0.08)')
      .attr('stroke-width', 1)

    /* ── Project node circles ───────────────────────────────────────────── */

    const projNodes = projectNodes.map(n => n.id)

    const hubEls = gNodes
      .selectAll<SVGCircleElement, SimNode>('.hub')
      .data(hubs)
      .enter()
      .append('circle')
      .attr('class', 'hub')
      .attr('r', 28)
      .attr('fill', d => `color-mix(in srgb, ${d.clusterColor} 18%, transparent)`)
      .attr('stroke', d => d.clusterColor ?? '#888')
      .attr('stroke-width', 1.5)
      .style('cursor', 'default')
      .style('opacity', 0)

    const projEls = gNodes
      .selectAll<SVGCircleElement, SimNode>('.proj')
      .data(projectNodes)
      .enter()
      .append('circle')
      .attr('class', 'proj')
      .attr('r', 13)
      .attr('fill', d => `color-mix(in srgb, ${d.clusterColor2} 26%, transparent)`)
      .attr('stroke', d => d.clusterColor2 ?? '#888')
      .attr('stroke-width', 1.2)
      .style('cursor', 'pointer')
      .style('opacity', 0)

    /* ── Hub labels ────────────────────────────────────────────────────── */

    const hubLabels = gLabels
      .selectAll<SVGTextElement, SimNode>('.hub-label')
      .data(hubs)
      .enter()
      .append('text')
      .attr('class', 'hub-label')
      .attr('fill', d => d.clusterColor ?? '#888')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '9px')
      .attr('letter-spacing', '0.12em')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none')
      .style('opacity', 0)
      .text(d => (d.clusterLabel ?? '').toUpperCase())

    /* ── Project hover labels ───────────────────────────────────────────── */

    // Background rect + text groups for hover
    const projLabelGroups = gLabels
      .selectAll<SVGGElement, SimNode>('.proj-label-g')
      .data(projectNodes)
      .enter()
      .append('g')
      .attr('class', 'proj-label-g')
      .attr('pointer-events', 'none')
      .style('opacity', 0)

    projLabelGroups.append('text')
      .attr('class', 'proj-label-text')
      .attr('fill', '#ece9e1')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '9px')
      .attr('letter-spacing', '0.07em')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('dy', '-20')
      .text(d => d.project?.title ?? '')

    /* ── Project year sub-label ─────────────────────────────────────────── */

    const projYearGroups = gLabels
      .selectAll<SVGGElement, SimNode>('.proj-year-g')
      .data(projectNodes)
      .enter()
      .append('g')
      .attr('class', 'proj-year-g')
      .attr('pointer-events', 'none')
      .style('opacity', 0)

    projYearGroups.append('text')
      .attr('fill', '#615f58')
      .attr('font-family', 'var(--font-mono), "Space Mono", monospace')
      .attr('font-size', '8px')
      .attr('letter-spacing', '0.05em')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('dy', '-10')
      .text(d => d.project?.year ?? '')

    /* ── Drag behavior ──────────────────────────────────────────────────── */

    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    hubEls.call(drag as d3.DragBehavior<SVGCircleElement, SimNode, SimNode>)
    projEls.call(drag as d3.DragBehavior<SVGCircleElement, SimNode, SimNode>)

    /* ── Click / hover on project nodes ────────────────────────────────── */

    projEls
      .on('click', (_event, d) => {
        const proj = d.project ?? null
        onSelect(proj)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(150).attr('r', 17)
        // show label for this node
        const nodeId = d.id
        projLabelGroups
          .filter(s => s.id === nodeId)
          .transition().duration(150)
          .style('opacity', 1)
        projYearGroups
          .filter(s => s.id === nodeId)
          .transition().duration(150)
          .style('opacity', 1)
      })
      .on('mouseleave', function(event, d) {
        const isSelected = selected?.id === d.project?.id
        d3.select(this).transition().duration(150).attr('r', 13)
        if (!isSelected) {
          const nodeId = d.id
          projLabelGroups
            .filter(s => s.id === nodeId)
            .transition().duration(200)
            .style('opacity', 0)
          projYearGroups
            .filter(s => s.id === nodeId)
            .transition().duration(200)
            .style('opacity', 0)
        }
      })

    /* ── Simulation tick ────────────────────────────────────────────────── */

    sim.on('tick', () => {
      linkEl
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      hubEls.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      projEls.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)

      hubLabels.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)

      projLabelGroups.attr('transform', d => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
      projYearGroups.attr('transform',  d => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
    })

    /* ── Fade in after short delay ──────────────────────────────────────── */

    const fadeTimer = setTimeout(() => {
      hubEls
        .transition().duration(800)
        .style('opacity', 1)
      projEls
        .transition().duration(800).delay((_d, i) => i * 40)
        .style('opacity', 1)
      hubLabels
        .transition().duration(800)
        .style('opacity', 1)
      setReady(true)
    }, 120)

    /* ── Resize handler ─────────────────────────────────────────────────── */

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

  /* ── Sync selection highlight (runs without re-mounting sim) ────────── */

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    if (!selected) {
      // restore all
      svg.selectAll<SVGCircleElement, SimNode>('.proj')
        .transition().duration(200)
        .style('opacity', 1)
        .attr('stroke-width', 1.2)
      svg.selectAll<SVGLineElement, SimLink>('line')
        .transition().duration(200)
        .style('opacity', 1)
      svg.selectAll<SVGCircleElement, SimNode>('.hub')
        .transition().duration(200)
        .style('opacity', 1)
    } else {
      // fade unrelated, highlight selected
      svg.selectAll<SVGCircleElement, SimNode>('.proj')
        .transition().duration(200)
        .style('opacity', d =>
          d.project?.id === selected.id ? 1 : 0.15)
        .attr('stroke-width', d =>
          d.project?.id === selected.id ? 2.5 : 1.2)
        .attr('stroke', d =>
          d.project?.id === selected.id
            ? '#d6ff3f'
            : (d.clusterColor2 ?? '#888'))

      svg.selectAll<SVGLineElement, SimLink>('line')
        .transition().duration(200)
        .style('opacity', d => {
          const t = d.target as SimNode
          return t.project?.id === selected.id ? 0.5 : 0.04
        })

      svg.selectAll<SVGCircleElement, SimNode>('.hub')
        .transition().duration(200)
        .style('opacity', d =>
          d.clusterId === selected.cl ? 1 : 0.25)
    }
  }, [selected])

  return (
    <svg
      ref={svgRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        pointerEvents: 'auto',
        zIndex:        5,
        opacity:       ready ? 1 : 0,
        transition:    'opacity 0.8s ease',
      }}
    />
  )
}
