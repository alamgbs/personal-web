import { createClient } from '@supabase/supabase-js'

import { generateIdeaBriefPdf } from '../src/lib/mission-control/idea-brief-pdf'
import { buildIdeaBriefDiscordMessage, buildIdeaBriefFilename, buildIdeaBriefReport } from '../src/lib/mission-control/idea-brief-report'
import { migrateIdeaRecordShape } from '../src/lib/mission-control/idea-step-migration'
import { FINAL_IDEA_STEP_INDEX } from '../src/lib/mission-control/idea-steps'

type BusinessIdeaRow = {
  id: string
  title: string | null
  slug: string | null
  summary: string | null
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
  workflow_stage: string | null
  automation_status: string | null
  review_requested_at: string | null
}

type DeliveryResult = {
  ok: boolean
  status?: number
  error?: string
}

function readLimit() {
  const raw = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1]
  if (!raw) return 10
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid --limit value: ${raw}`)
  }
  return parsed
}

function hasSentDailyBrief(stepData: Record<string, unknown>) {
  const finalStep = (stepData[FINAL_IDEA_STEP_INDEX.toString()] || {}) as Record<string, unknown>
  return typeof finalStep.final_brief_daily_brief_sent_at === 'string' && finalStep.final_brief_daily_brief_sent_at.trim().length > 0
}

async function deliverToDiscord(params: { message: string; pdf: Uint8Array; filename: string }): Promise<DeliveryResult> {
  const webhookUrl = process.env.DISCORD_DAILY_BRIEF_WEBHOOK_URL?.trim()
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim()
  const channelId = process.env.DISCORD_DAILY_BRIEF_CHANNEL_ID?.trim()

  if (!webhookUrl && (!botToken || !channelId)) {
    return {
      ok: false,
      error: 'Missing DISCORD_DAILY_BRIEF_WEBHOOK_URL or DISCORD_BOT_TOKEN + DISCORD_DAILY_BRIEF_CHANNEL_ID.',
    }
  }

  const form = new FormData()
  const safeMessage = params.message.length > 1900 ? `${params.message.slice(0, 1899).trim()}…` : params.message
  form.append(
    'payload_json',
    JSON.stringify({
      content: safeMessage,
      allowed_mentions: { parse: [] },
    })
  )
  const pdfPart = params.pdf.buffer.slice(params.pdf.byteOffset, params.pdf.byteOffset + params.pdf.byteLength) as ArrayBuffer
  form.append('files[0]', new Blob([pdfPart], { type: 'application/pdf' }), params.filename)

  const response = webhookUrl
    ? await fetch(webhookUrl, { method: 'POST', body: form })
    : await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}` },
        body: form,
      })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      ok: false,
      status: response.status,
      error: `Discord rejected the PDF (${response.status}). ${body.slice(0, 300)}`.trim(),
    }
  }

  return { ok: true, status: response.status }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const write = process.argv.includes('--write')
  const limit = readLimit()

  if (!supabaseUrl || !serviceRole) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in the environment.')
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('business_ideas')
    .select('id,title,slug,summary,current_step,step_data,step_approvals,workflow_stage,automation_status,review_requested_at')
    .eq('workflow_stage', 'idea_review')
    .eq('automation_status', 'needs_feedback')
    .order('review_requested_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const candidates = ((data || []) as BusinessIdeaRow[])
    .map((idea) => ({
      idea,
      migrated: migrateIdeaRecordShape({
        current_step: idea.current_step,
        step_data: idea.step_data,
        step_approvals: idea.step_approvals,
      }),
    }))
    .filter(({ migrated }) => !hasSentDailyBrief(migrated.step_data || {}))
    .slice(0, limit)

  console.log(`${write ? 'Sending' : 'Dry run:'} ${candidates.length} pending final idea brief PDF(s).`)

  for (const { idea, migrated } of candidates) {
    const input = {
      id: idea.id,
      title: idea.title || 'Idea sin título',
      slug: idea.slug,
      summary: idea.summary,
      stepData: migrated.step_data,
      stepApprovals: migrated.step_approvals,
      approvedAt: null,
    }
    const report = buildIdeaBriefReport(input)
    const filename = buildIdeaBriefFilename(input)
    const pdf = await generateIdeaBriefPdf(input)

    if (!write) {
      console.log(`- ${idea.title || idea.id}: ${filename} (${pdf.byteLength} bytes)`)
      continue
    }

    const attemptedAt = new Date().toISOString()
    const delivery = await deliverToDiscord({
      message: buildIdeaBriefDiscordMessage(report),
      pdf,
      filename,
    })
    const finalStepKey = FINAL_IDEA_STEP_INDEX.toString()
    const finalStep = (migrated.step_data[finalStepKey] || {}) as Record<string, unknown>
    const updatedStepData = {
      ...migrated.step_data,
      [finalStepKey]: {
        ...finalStep,
        final_brief_daily_brief_attempted_at: attemptedAt,
        final_brief_daily_brief_filename: filename,
        final_brief_daily_brief_bytes: pdf.byteLength,
        final_brief_daily_brief_status: delivery.status || null,
        final_brief_daily_brief_error: delivery.ok ? null : delivery.error || 'No se pudo enviar el PDF final al canal daily-brief.',
        ...(delivery.ok ? { final_brief_daily_brief_sent_at: attemptedAt } : {}),
      },
    }

    const { error: updateError } = await supabase
      .from('business_ideas')
      .update({
        current_step: migrated.current_step,
        step_data: updatedStepData,
        step_approvals: migrated.step_approvals,
        updated_at: new Date().toISOString(),
        automation_completed_at: new Date().toISOString(),
        last_automation_error: delivery.ok ? null : delivery.error || 'No se pudo enviar el PDF final al canal daily-brief.',
      })
      .eq('id', idea.id)

    if (updateError) {
      throw new Error(`Failed to update ${idea.id}: ${updateError.message}`)
    }

    if (!delivery.ok) {
      throw new Error(`${idea.title || idea.id}: ${delivery.error}`)
    }

    console.log(`- sent ${idea.title || idea.id}: ${filename} (${pdf.byteLength} bytes, Discord ${delivery.status})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
