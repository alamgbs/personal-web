'use client'

import { useState } from 'react'
import { IdeaList } from './IdeaList'
import { IdeaWizard } from './IdeaWizard'

type Idea = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string | null
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
}

type Props = {
  ideas: Idea[]
}

export function IdeasPanel({ ideas }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    ideas.length > 0 ? ideas[0].id : null
  )

  const selectedIdea = ideas.find((i) => i.id === selectedId) || null

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100dvh - 0px)',
      overflow: 'hidden',
    }}>
      <IdeaList
        ideas={ideas}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {selectedIdea ? (
          <IdeaWizard idea={selectedIdea} />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.08em',
            gap: '12px',
          }}>
            <span style={{ fontSize: '2rem' }}>💡</span>
            <span>Selecciona una idea o crea una nueva</span>
          </div>
        )}
      </div>
    </div>
  )
}
