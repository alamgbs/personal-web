import 'server-only'

import {
  buildIdeaBriefDiscordMessage,
  buildIdeaBriefFilename,
  buildIdeaBriefReport,
  type IdeaBriefInput,
} from '@/lib/mission-control/idea-brief-report'
import { generateIdeaBriefPdf } from '@/lib/mission-control/idea-brief-pdf'

export type IdeaBriefDeliveryResult = {
  ok: boolean
  skipped?: boolean
  filename?: string
  bytes?: number
  error?: string
  discordStatus?: number
}

export async function sendIdeaFinalBriefToDailyBrief(input: IdeaBriefInput): Promise<IdeaBriefDeliveryResult> {
  const webhookUrl = process.env.DISCORD_DAILY_BRIEF_WEBHOOK_URL?.trim()
  const report = buildIdeaBriefReport(input)
  const filename = buildIdeaBriefFilename(input)

  if (!webhookUrl) {
    return {
      ok: false,
      skipped: true,
      filename,
      error: 'Falta configurar DISCORD_DAILY_BRIEF_WEBHOOK_URL para enviar el PDF al canal daily-brief.',
    }
  }

  const pdf = await generateIdeaBriefPdf(input)
  const form = new FormData()
  form.append(
    'payload_json',
    JSON.stringify({
      content: buildIdeaBriefDiscordMessage(report),
      allowed_mentions: { parse: [] },
    })
  )
  form.append('files[0]', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      ok: false,
      filename,
      bytes: pdf.byteLength,
      discordStatus: response.status,
      error: `Discord daily-brief rechazó el PDF (${response.status}). ${body.slice(0, 300)}`.trim(),
    }
  }

  return {
    ok: true,
    filename,
    bytes: pdf.byteLength,
    discordStatus: response.status,
  }
}
