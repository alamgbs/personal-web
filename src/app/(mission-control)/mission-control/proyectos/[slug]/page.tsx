import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectKanbanBoard } from '@/components/mission-control/ProjectKanbanBoard'

type BacklogItem = {
  id: string
  project_id: string | null
  title: string
  description: string | null
  status: string | null
  priority: string | null
  type: string | null
  assignee_slug: string | null
  tags: string[] | null
  position: number | null
}

export const metadata = { title: 'Proyecto · Mission Control' }

export default async function MissionControlProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, backlog_items (*)')
    .eq('slug', slug)
    .single()

  if (error || !project) {
    notFound()
  }

  const items = ((project.backlog_items || []) as BacklogItem[]).sort(
    (a: BacklogItem, b: BacklogItem) => (a.position || 0) - (b.position || 0)
  )

  return <ProjectKanbanBoard project={project} items={items} />
}
