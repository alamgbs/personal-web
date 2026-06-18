import { notFound } from 'next/navigation'
import { ProjectKanbanBoard } from '@/components/mission-control/ProjectKanbanBoard'
import { listProjectBacklogRuntime } from '@/lib/mission-control/backlog-runtime'
import { createClient } from '@/lib/supabase/server'

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

  const items = await listProjectBacklogRuntime(project.id)

  return <ProjectKanbanBoard project={project} items={items} />
}
