'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const supabase = await createClient()

  const techStack = (formData.get('tech_stack') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const { error } = await supabase.from('projects').insert({
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    github_repo: formData.get('github_repo') as string,
    url: formData.get('url') as string,
    status: (formData.get('status') as string) || 'active',
    tech_stack: techStack,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/proyectos')
  return { success: true }
}

export async function createBacklogItem(formData: FormData) {
  const supabase = await createClient()

  const tags = (formData.get('tags') as string)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) || []

  const { error } = await supabase.from('backlog_items').insert({
    project_id: formData.get('project_id') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    status: (formData.get('status') as string) || 'backlog',
    priority: (formData.get('priority') as string) || 'medium',
    type: (formData.get('type') as string) || 'task',
    assignee_slug: formData.get('assignee_slug') as string,
    tags,
    position: 0,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/proyectos')
  return { success: true }
}

export async function updateBacklogItemStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('backlog_items')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/proyectos')
  return { success: true }
}

export async function moveBacklogItem(input: {
  id: string
  projectSlug: string
  status: string
  position: number
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('backlog_items')
    .update({
      status: input.status,
      position: input.position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${input.projectSlug}`)
  return { success: true }
}

export async function approveProjectPrd(projectId: string) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug, prd_status')
    .eq('id', projectId)
    .single()

  if (projectError) {
    return { error: projectError.message }
  }

  if (project.prd_status === 'approved') {
    return { success: true }
  }

  const downstreamItems = [
    {
      project_id: project.id,
      title: `Sprint 0 plan · ${project.name}`,
      description: 'Dev Lead desglosa arquitectura, sprints, entregables iterativos, riesgos y secuencia de ejecución después de la aprobación del PRD.',
      status: 'backlog',
      priority: 'high',
      type: 'task',
      assignee_slug: 'dev-lead',
      tags: ['sprint-0', 'delivery-plan', 'dev'],
      position: 1,
    },
    {
      project_id: project.id,
      title: `UX concept · ${project.name}`,
      description: 'UX/UI aterriza flujos, pantallas y restricciones del MVP ya alineado al PRD aprobado.',
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'ux-ui',
      tags: ['ux', 'journey', 'mvp'],
      position: 2,
    },
    {
      project_id: project.id,
      title: `Validation memo · ${project.name}`,
      description: 'Research arma memo de benchmark, riesgos y métricas a vigilar durante sprint planning.',
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'research',
      tags: ['research', 'validation', 'market'],
      position: 3,
    },
  ]

  const { data: existingItems, error: existingError } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)

  if (existingError) {
    return { error: existingError.message }
  }

  const existingTitles = new Set((existingItems || []).map((item) => item.title))
  const itemsToInsert = downstreamItems.filter((item) => !existingTitles.has(item.title))

  if (itemsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('backlog_items').insert(itemsToInsert)
    if (insertError) {
      return { error: insertError.message }
    }
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      prd_status: 'approved',
      prd_approved_at: new Date().toISOString(),
      delivery_status: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true }
}
