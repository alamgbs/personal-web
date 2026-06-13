'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getProjectsByCluster, type Project } from '@/data/projects'
import ProjectCard from './ProjectCard'

gsap.registerPlugin(ScrollTrigger)

interface ProjectsGridProps {
  onNavigate: (project: Project, rect: DOMRect) => void
}

export default function ProjectsGrid({ onNavigate }: ProjectsGridProps) {
  const gridRef = useRef<HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const groups = getProjectsByCluster()

  // Click outside to deselect
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!gridRef.current) return
      const target = e.target as HTMLElement
      if (!target.closest('.project-card')) {
        setSelectedProject(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // GSAP entrance animation
  useEffect(() => {
    if (!gridRef.current) return

    const cards = gridRef.current.querySelectorAll('.project-card')
    const labels = gridRef.current.querySelectorAll('.category-label')

    // Set initial chaotic state
    gsap.set(cards, {
      opacity: 0,
      y: 40,
      rotation: () => gsap.utils.random(-3, 3),
      scale: 0.92,
    })
    gsap.set(labels, { opacity: 0, y: 20 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: gridRef.current,
        start: 'top 80%',
        once: true,
      },
    })

    // Labels appear first
    tl.to(labels, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
    })

    // Large cards
    const lgCards = gridRef.current.querySelectorAll('.project-card.col-span-2.row-span-2')
    if (lgCards.length) {
      tl.to(lgCards, {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.06,
        ease: 'power3.out',
      }, '-=0.3')
    }

    // Medium cards
    const mdCards = gridRef.current.querySelectorAll('.project-card.col-span-2.row-span-1')
    if (mdCards.length) {
      tl.to(mdCards, {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out',
      }, '-=0.4')
    }

    // Small cards
    const smCards = gridRef.current.querySelectorAll('.project-card.col-span-1.row-span-1')
    if (smCards.length) {
      tl.to(smCards, {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.04,
        ease: 'power3.out',
      }, '-=0.3')
    }

    return () => {
      tl.kill()
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  const handleSelect = useCallback((project: Project) => {
    setSelectedProject(project)
  }, [])

  const handleDeselect = useCallback(() => {
    setSelectedProject(null)
  }, [])

  return (
    <section
      id="projects"
      ref={gridRef}
      style={{
        padding: 'clamp(4rem,10vh,8rem) clamp(1.5rem,4vw,3rem)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: 'clamp(2rem,4vh,3rem)' }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--color-acid)',
            marginBottom: '0.5rem',
          }}
        >
          WORK
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            fontSize: 'clamp(1.8rem,3.5vw,2.8rem)',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            color: 'var(--color-text)',
            margin: 0,
          }}
        >
          Proyectos seleccionados
        </h2>
      </div>

      {/* Grid by category */}
      {groups.map(({ cluster, projects }) => (
        <div key={cluster.id} style={{ marginBottom: 'clamp(2rem,4vh,3rem)' }}>
          {/* Category label — target for hero keyword morph */}
          <div
            className="category-label"
            data-cluster={cluster.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: cluster.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                color: cluster.color,
              }}
            >
              {cluster.label.toUpperCase()}
            </span>
          </div>

          {/* Cards grid */}
          <div className="projects-grid-inner">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                isAnySelected={selectedProject !== null}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Responsive grid styles */}
      <style>{`
        .projects-grid-inner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 1024px) {
          .projects-grid-inner {
            grid-template-columns: repeat(2, 1fr);
          }
          .project-card.col-span-2.row-span-2 {
            grid-row: span 1 !important;
          }
        }
        @media (max-width: 640px) {
          .projects-grid-inner {
            grid-template-columns: 1fr;
          }
          .project-card.col-span-2 {
            grid-column: span 1 !important;
          }
          .project-card.row-span-2 {
            grid-row: span 1 !important;
          }
        }
      `}</style>
    </section>
  )
}
