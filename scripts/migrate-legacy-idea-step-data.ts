import { createClient } from '@supabase/supabase-js'

import { migrateIdeaRecordShape } from '../src/lib/mission-control/idea-step-migration'

type BusinessIdeaRow = {
  id: string
  title: string
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const write = process.argv.includes('--write')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in the environment.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('business_ideas')
    .select('id, title, current_step, step_data, step_approvals')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const ideas = (data || []) as BusinessIdeaRow[]
  const changedIdeas = ideas
    .map((idea) => {
      const migrated = migrateIdeaRecordShape({
        current_step: idea.current_step,
        step_data: idea.step_data,
        step_approvals: idea.step_approvals,
      })

      return {
        idea,
        migrated,
      }
    })
    .filter(({ migrated }) => migrated.changed)

  console.log(`Ideas found: ${ideas.length}`)
  console.log(`Ideas needing migration: ${changedIdeas.length}`)

  for (const { idea, migrated } of changedIdeas) {
    console.log(`- ${idea.title} (${idea.id}) -> current_step ${idea.current_step ?? 0} => ${migrated.current_step ?? 0}`)
  }

  if (!write || changedIdeas.length === 0) {
    console.log(write ? 'No rows required updates.' : 'Dry run only. Re-run with --write to persist changes.')
    return
  }

  for (const { idea, migrated } of changedIdeas) {
    const { error: updateError } = await supabase
      .from('business_ideas')
      .update({
        current_step: migrated.current_step,
        step_data: migrated.step_data,
        step_approvals: migrated.step_approvals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idea.id)

    if (updateError) {
      throw new Error(`Failed to update ${idea.id}: ${updateError.message}`)
    }
  }

  console.log(`Updated ${changedIdeas.length} ideas.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
