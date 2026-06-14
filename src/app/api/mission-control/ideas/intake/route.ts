import { NextResponse } from 'next/server'
import { queueIdeaPipelineAutomation, startIdeaPipelineAutomation } from '@/lib/mission-control/automation'
import { createAdminClient } from '@/lib/supabase/admin'

type IntakePayload = {
  title?: string
  summary?: string
  notificationTarget?: string
  intakeSource?: string
  intakeChannel?: string
  autoStart?: boolean
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function POST(request: Request) {
  const token = process.env.MISSION_CONTROL_AUTOMATION_TOKEN?.trim()

  if (!token) {
    console.error('[mission-control/intake] Missing MISSION_CONTROL_AUTOMATION_TOKEN')
    return NextResponse.json(
      { error: 'Mission Control intake is not configured securely.' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: IntakePayload
  try {
    payload = (await request.json()) as IntakePayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const title = payload.title?.trim()
  if (!title) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Missing privileged Supabase credentials for intake route.',
      },
      { status: 500 }
    )
  }

  const slugBase = slugify(title)
  const slug = `${slugBase || 'idea'}-${Date.now().toString().slice(-6)}`

  const { data, error } = await supabase
    .from('business_ideas')
    .insert({
      title,
      slug,
      summary: payload.summary?.trim() || null,
      status: 'in_analysis',
      current_step: 0,
      step_data: {},
      step_approvals: {},
      intake_source: payload.intakeSource || 'discord',
      intake_channel: payload.intakeChannel || null,
      notification_target: payload.notificationTarget || null,
      workflow_stage: 'idea_pipeline',
      automation_status: 'queued',
      automation_requested_at: new Date().toISOString(),
    })
    .select('id, title, slug, workflow_stage, automation_status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'No se pudo crear la idea.' }, { status: 500 })
  }

  if (payload.autoStart !== false) {
    try {
      await queueIdeaPipelineAutomation(data.id)
      startIdeaPipelineAutomation(data.id)
    } catch (automationError) {
      return NextResponse.json(
        {
          error:
            automationError instanceof Error
              ? automationError.message
              : 'La idea se creó, pero falló el encolado inicial.',
          idea: data,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true, idea: data })
}
