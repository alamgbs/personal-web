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
