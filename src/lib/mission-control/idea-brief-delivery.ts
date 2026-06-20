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
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim()
  const channelId = process.env.DISCORD_DAILY_BRIEF_CHANNEL_ID?.trim()
  const report = buildIdeaBriefReport(input)
  const filename = buildIdeaBriefFilename(input)

  if (!webhookUrl && (!botToken || !channelId)) {
    return {
      ok: false,
      skipped: true,
      filename,
      error:
        'Falta configurar DISCORD_DAILY_BRIEF_WEBHOOK_URL o DISCORD_BOT_TOKEN + DISCORD_DAILY_BRIEF_CHANNEL_ID para enviar el PDF al canal daily-brief.',
    }
  }

  const pdf = await generateIdeaBriefPdf(input)
  const form = new FormData()
  const message = buildIdeaBriefDiscordMessage(report)
  const safeMessage = message.length > 1900 ? `${message.slice(0, 1899).trim()}…` : message
  form.append(
    'payload_json',
    JSON.stringify({
      content: safeMessage,
      allowed_mentions: { parse: [] },
    })
  )
  form.append('files[0]', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename)

  const response = webhookUrl
    ? await fetch(webhookUrl, {
        method: 'POST',
        body: form,
      })
    : await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
        },
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
