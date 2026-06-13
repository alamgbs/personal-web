'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import type { Project } from '@/data/projects'
import { getCluster } from '@/data/projects'

interface ProjectCardProps {
  project: Project
  isSelected: boolean
  isAnySelected: boolean
  onSelect: (project: Project) => void
  onDeselect: () => void
  onNavigate: (project: Project, rect: DOMRect) => void
}

export default function ProjectCard({
  project,
  isSelected,
  isAnySelected,
  onSelect,
  onDeselect,
  onNavigate,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const cluster = getCluster(project.cl)
  const color = cluster?.color ?? '#888'

  // Animate selection/deselection
  useEffect(() => {
    if (!cardRef.current) return
    const el = cardRef.current

    if (isSelected) {
      gsap.to(el, {
        scale: 1.08,
        zIndex: 30,
        duration: 0.4,
        ease: 'power3.out',
        boxShadow: `0 20px 40px rgba(0,0,0,0.5)`,
      })
    } else if (isAnySelected) {
      gsap.to(el, {
        scale: 1,
        zIndex: 1,
        opacity: 0.3,
        filter: 'blur(2px)',
        duration: 0.4,
        ease: 'power3.out',
      })
    } else {
      gsap.to(el, {
        scale: 1,
        zIndex: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.4,
        ease: 'power3.out',
        boxShadow: 'none',
      })
    }
  }, [isSelected, isAnySelected])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isSelected) {
      onDeselect()
    } else {
      onSelect(project)
    }
  }

  function handleNavigateClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    onNavigate(project, rect)
  }

  // Grid span classes based on size
  const sizeClasses: Record<string, string> = {
    lg: 'col-span-2 row-span-2',
    md: 'col-span-2 row-span-1',
    sm: 'col-span-1 row-span-1',
  }

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`project-card ${sizeClasses[project.size]}`}
      data-project-id={project.id}
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderLeft: project.size !== 'sm' ? `3px solid ${color}` : '1px solid var(--color-border)',
        padding: project.size === 'sm' ? '0.75rem 1rem' : '1.25rem 1.5rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        willChange: 'transform, opacity, filter',
        transition: 'border-color 200ms',
      }}
      onMouseEnter={(e) => {
        if (!isAnySelected) {
          gsap.to(e.currentTarget, {
            y: -4,
            borderColor: '#3a3a36',
            duration: 0.25,
            ease: 'power2.out',
          })
        }
      }}
      onMouseLeave={(e) => {
        if (!isAnySelected) {
          gsap.to(e.currentTarget, {
            y: 0,
            borderColor: 'var(--color-border)',
            duration: 0.25,
            ease: 'power2.out',
          })
        }
      }}
    >
      {/* Year badge — lg and md only */}
      {project.size !== 'sm' && (
        <span
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.06em',
            color: 'var(--color-text-faint)',
          }}
        >
          {project.year}
        </span>
      )}

      {/* Category dot — sm cards */}
      {project.size === 'sm' && (
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            marginRight: '0.5rem',
            flexShrink: 0,
          }}
        />
      )}

      {/* Title */}
      <h3
        style={{
          fontFamily: project.size === 'sm' ? 'var(--font-mono)' : 'var(--font-heading)',
          fontWeight: project.size === 'sm' ? 400 : 500,
          fontSize: project.size === 'lg' ? '1.1rem' : project.size === 'md' ? '1rem' : '0.75rem',
          letterSpacing: project.size === 'sm' ? '0.04em' : '-0.015em',
          color: 'var(--color-text)',
          margin: 0,
          display: project.size === 'sm' ? 'inline' : 'block',
        }}
      >
        {project.title}
      </h3>

      {/* Description — lg only (before expansion) */}
      {project.size === 'lg' && !isSelected && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            color: 'var(--color-text-faint)',
            lineHeight: 1.65,
            margin: '0.5rem 0 0 0',
          }}
        >
          {project.desc}
        </p>
      )}

      {/* Tags — lg and md */}
      {project.size !== 'sm' && !isSelected && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {project.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.06em',
                color: 'var(--color-text-faint)',
                border: '1px solid var(--color-border)',
                padding: '2px 6px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded content — step 1 protagonist mode */}
      {isSelected && (
        <div style={{ marginTop: '0.75rem' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-text-faint)',
              lineHeight: 1.7,
              margin: '0 0 1rem 0',
            }}
          >
            {project.descLong || project.desc}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
            {project.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-faint)',
                  border: '1px solid var(--color-border)',
                  padding: '2px 6px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={handleNavigateClick}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              color: 'var(--color-acid)',
              background: 'none',
              border: `1px solid var(--color-acid)`,
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'background 200ms, color 200ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-acid)'
              e.currentTarget.style.color = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = 'var(--color-acid)'
            }}
          >
            VER EN DETALLE →
          </button>
        </div>
      )}
    </div>
  )
}
