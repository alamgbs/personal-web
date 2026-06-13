'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  approvePlanningAndSeedSprint,
  approveProjectSprintReview,
  generateProjectPlanning,
  requestProjectSprintReview,
  startProjectSprint,
} from '@/lib/mission-control/automation'

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
    .select('id, slug, prd_markdown')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return { error: projectError?.message || 'Proyecto no encontrado.' }
  }

  if (!project.prd_markdown?.trim()) {
    return { error: 'El PRD todavía no fue generado. Espera a que Mission Control complete el draft.' }
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      prd_status: 'approved',
      prd_approved_at: new Date().toISOString(),
      execution_status: 'planning_generation',
      delivery_status: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (updateError) {
    return { error: updateError.message }
  }

  const { data: idea } = await supabase
    .from('business_ideas')
    .select('id')
    .eq('promoted_project_id', project.id)
    .single()

  if (idea?.id) {
    await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'planning_generation',
        automation_status: 'queued',
        automation_requested_at: new Date().toISOString(),
      })
      .eq('id', idea.id)
  }

  try {
    await generateProjectPlanning(project.id)
  } catch (automationError) {
    return {
      error:
        automationError instanceof Error
          ? automationError.message
          : 'El PRD fue aprobado, pero falló la generación automática del planning.',
    }
  }

  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true }
}

export async function approveProjectPlanning(projectId: string) {
  try {
    return await approvePlanningAndSeedSprint(projectId)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo aprobar el planning.',
    }
  }
}

export async function beginProjectSprint(projectId: string) {
  try {
    return await startProjectSprint(projectId)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo iniciar el sprint.',
    }
  }
}

export async function submitProjectSprintReview(projectId: string) {
  try {
    return await requestProjectSprintReview(projectId)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo preparar el sprint review.',
    }
  }
}

export async function approveProjectSprint(projectId: string) {
  try {
    return await approveProjectSprintReview(projectId)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo aprobar el sprint review.',
    }
  }
}
