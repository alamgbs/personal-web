import PDFDocument from 'pdfkit'
import {
  buildIdeaBriefReport,
  type IdeaBriefField,
  type IdeaBriefInput,
  type IdeaBriefReport,
  type IdeaBriefSection,
} from '@/lib/mission-control/idea-brief-report'

const COLORS = {
  bg: '#0c0c0a',
  ink: '#161616',
  text: '#20201c',
  faint: '#6b6762',
  border: '#d7d2c7',
  surface: '#f7f4eb',
  acid: '#99bd20',
  coral: '#ff6a3d',
  blue: '#2563eb',
}

const PAGE = {
  marginX: 48,
  marginTop: 52,
  marginBottom: 52,
  width: 595.28,
  height: 841.89,
}

function fieldColor(field: IdeaBriefField) {
  switch (field.emphasis) {
    case 'acid':
      return COLORS.acid
    case 'coral':
      return COLORS.coral
    case 'blue':
      return COLORS.blue
    default:
      return COLORS.text
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Pendiente de aprobación'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-PY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function truncate(value: string, max = 900) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trim()}…`
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed <= PAGE.height - PAGE.marginBottom) return
  doc.addPage()
}

function drawPageBackground(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill('#fbfaf5')
  doc.rect(0, 0, PAGE.width, 18).fill(COLORS.bg)
  doc.rect(PAGE.marginX, 34, 34, 3).fill(COLORS.acid)
  doc.rect(PAGE.width - PAGE.marginX - 18, 34, 18, 3).fill(COLORS.coral)
  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8)
  doc.text('MISSION CONTROL · IDEA FINAL BRIEF', PAGE.marginX, PAGE.height - 30, { characterSpacing: 1.2 })
}

function addPage(doc: PDFKit.PDFDocument) {
  doc.addPage()
  drawPageBackground(doc)
}

function drawKeyValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(7)
  doc.text(label.toUpperCase(), x, y, { width, characterSpacing: 0.9 })
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
  doc.text(value, x, y + 12, { width, lineGap: 2 })
}

function drawCover(doc: PDFKit.PDFDocument, report: IdeaBriefReport) {
  drawPageBackground(doc)

  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(30)
  doc.text(report.title, PAGE.marginX, 88, {
    width: PAGE.width - PAGE.marginX * 2,
    lineGap: 4,
  })

  if (report.summary) {
    doc.moveDown(0.9)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(12)
    doc.text(report.summary, {
      width: PAGE.width - PAGE.marginX * 2,
      lineGap: 4,
    })
  }

  const cardY = Math.max(doc.y + 28, 270)
  doc.roundedRect(PAGE.marginX, cardY, PAGE.width - PAGE.marginX * 2, 138, 14).fill('#11110f')
  doc.rect(PAGE.marginX, cardY, 5, 138).fill(COLORS.acid)

  doc.fillColor(COLORS.acid).font('Helvetica').fontSize(8)
  doc.text('VEREDICTO HERMES', PAGE.marginX + 22, cardY + 22, { characterSpacing: 1.1 })
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
  doc.text(report.verdict || 'Sin veredicto explícito', PAGE.marginX + 22, cardY + 40, {
    width: PAGE.width - PAGE.marginX * 2 - 44,
    lineGap: 3,
  })

  if (report.rationale) {
    doc.fillColor('#d9d9cf').font('Helvetica').fontSize(10)
    doc.text(truncate(report.rationale, 420), PAGE.marginX + 22, doc.y + 10, {
      width: PAGE.width - PAGE.marginX * 2 - 44,
      lineGap: 3,
    })
  }

  const statsY = cardY + 174
  const colWidth = (PAGE.width - PAGE.marginX * 2 - 24) / 3
  drawKeyValue(doc, 'Estado', formatDate(report.approvedAt), PAGE.marginX, statsY, colWidth)
  drawKeyValue(doc, 'Cobertura', `${report.completedSteps}/${report.totalSteps} pasos`, PAGE.marginX + colWidth + 12, statsY, colWidth)
  drawKeyValue(doc, 'Fuente', 'JSON del wizard · sin regenerar', PAGE.marginX + (colWidth + 12) * 2, statsY, colWidth)

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12)
  doc.text('Índice del análisis', PAGE.marginX, statsY + 76)

  let y = statsY + 102
  report.sections.forEach((section) => {
    doc.fillColor(section.stepIndex === report.totalSteps - 1 ? COLORS.coral : COLORS.faint).font('Helvetica-Bold').fontSize(8)
    doc.text(`${String(section.stepIndex + 1).padStart(2, '0')}`, PAGE.marginX, y, { width: 24 })
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(9)
    doc.text(section.label, PAGE.marginX + 32, y, { width: PAGE.width - PAGE.marginX * 2 - 32 })
    y += 17
  })
}

function drawField(doc: PDFKit.PDFDocument, field: IdeaBriefField, maxWidth: number) {
  const labelHeight = doc.heightOfString(field.label.toUpperCase(), { width: maxWidth })
  const value = truncate(field.value, 1200)
  const valueHeight = doc.heightOfString(value, { width: maxWidth, lineGap: 2 })
  const totalHeight = labelHeight + valueHeight + 22

  ensureSpace(doc, Math.min(totalHeight, 250))

  const startY = doc.y
  doc.roundedRect(PAGE.marginX, startY, maxWidth + 20, totalHeight, 7).fill(COLORS.surface)
  doc.rect(PAGE.marginX, startY, 3, totalHeight).fill(fieldColor(field))

  doc.fillColor(fieldColor(field)).font('Helvetica-Bold').fontSize(7)
  doc.text(field.label.toUpperCase(), PAGE.marginX + 12, startY + 9, {
    width: maxWidth,
    characterSpacing: 0.8,
  })

  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9)
  doc.text(value, PAGE.marginX + 12, doc.y + 6, {
    width: maxWidth,
    lineGap: 2,
  })

  doc.y = startY + totalHeight + 8
}

function drawSection(doc: PDFKit.PDFDocument, section: IdeaBriefSection) {
  addPage(doc)

  doc.fillColor(section.label.toLowerCase().includes('go / no-go') ? COLORS.coral : COLORS.acid).font('Helvetica-Bold').fontSize(9)
  doc.text(`PASO ${section.stepIndex + 1}`, PAGE.marginX, 62, { characterSpacing: 1.2 })

  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(20)
  doc.text(section.label, PAGE.marginX, 82, {
    width: PAGE.width - PAGE.marginX * 2,
    lineGap: 3,
  })

  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(10)
  doc.text(section.hint, PAGE.marginX, doc.y + 8, {
    width: PAGE.width - PAGE.marginX * 2,
    lineGap: 3,
  })

  if (section.owner) {
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8)
    doc.text(`OWNER · ${section.owner}`, PAGE.marginX, doc.y + 10, { characterSpacing: 0.8 })
  }

  if (section.agentDraft) {
    ensureSpace(doc, 120)
    const startY = doc.y + 16
    const draft = truncate(section.agentDraft, 1600)
    const draftHeight = doc.heightOfString(draft, { width: PAGE.width - PAGE.marginX * 2 - 26, lineGap: 3 }) + 42
    doc.roundedRect(PAGE.marginX, startY, PAGE.width - PAGE.marginX * 2, draftHeight, 10).fill('#11110f')
    doc.fillColor(COLORS.acid).font('Helvetica-Bold').fontSize(7)
    doc.text('DRAFT DEL AGENTE', PAGE.marginX + 14, startY + 13, { characterSpacing: 0.9 })
    doc.fillColor('#f2f2e8').font('Helvetica').fontSize(9)
    doc.text(draft, PAGE.marginX + 14, startY + 30, {
      width: PAGE.width - PAGE.marginX * 2 - 28,
      lineGap: 3,
    })
    doc.y = startY + draftHeight + 14
  } else {
    doc.y += 20
  }

  if (section.fields.length === 0) {
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(10)
    doc.text('Sin campos estructurados guardados para este paso.', PAGE.marginX, doc.y + 8)
    return
  }

  const fieldWidth = PAGE.width - PAGE.marginX * 2 - 20
  for (const field of section.fields) {
    drawField(doc, field, fieldWidth)
  }
}

export async function generateIdeaBriefPdf(input: IdeaBriefInput) {
  const report = buildIdeaBriefReport(input)
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: `${report.title} · Idea final brief`,
      Author: 'Mission Control',
      Subject: 'Idea wizard final report',
    },
  })

  const chunks: Buffer[] = []
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  drawCover(doc, report)
  report.sections.forEach((section) => drawSection(doc, section))

  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8)
    doc.text(`${i + 1}/${range.count}`, PAGE.width - PAGE.marginX - 34, PAGE.height - 30, {
      width: 34,
      align: 'right',
    })
  }

  doc.end()
  return result
}
