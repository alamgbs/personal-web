import PDFDocument from 'pdfkit'
import {
  buildIdeaBriefReport,
  type IdeaBriefChartSpec,
  type IdeaBriefField,
  type IdeaBriefInput,
  type IdeaBriefMetric,
  type IdeaBriefReport,
  type IdeaBriefSection,
} from '@/lib/mission-control/idea-brief-report'

const COLORS = {
  bg: '#0c0c0a',
  bg2: '#11110f',
  ink: '#161616',
  text: '#20201c',
  faint: '#6b6762',
  muted: '#918b80',
  border: '#d7d2c7',
  surface: '#f7f4eb',
  paper: '#fbfaf5',
  acid: '#d6ff3f',
  acidDark: '#8aa51c',
  coral: '#ff6a3d',
  blue: '#2563eb',
  white: '#f7f4eb',
}

const PAGE = {
  marginX: 46,
  marginTop: 58,
  marginBottom: 54,
  width: 595.28,
  height: 841.89,
}

const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2
const CONTENT_BOTTOM = PAGE.height - PAGE.marginBottom

type ChartRect = { x: number; y: number; width: number; height: number }

type PageContext = {
  section?: string
  step?: number
}

function fieldColor(field: Pick<IdeaBriefField | IdeaBriefMetric, 'emphasis'>) {
  switch (field.emphasis) {
    case 'acid':
      return COLORS.acidDark
    case 'coral':
      return COLORS.coral
    case 'blue':
      return COLORS.blue
    default:
      return COLORS.text
  }
}

function accentColor(value?: IdeaBriefField['emphasis']) {
  switch (value) {
    case 'acid':
      return COLORS.acid
    case 'coral':
      return COLORS.coral
    case 'blue':
      return COLORS.blue
    default:
      return COLORS.border
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function drawPageChrome(doc: PDFKit.PDFDocument, context: PageContext = {}) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.paper)
  doc.rect(0, 0, PAGE.width, 20).fill(COLORS.bg)
  doc.rect(PAGE.marginX, 35, 38, 3).fill(COLORS.acid)
  doc.rect(PAGE.width - PAGE.marginX - 22, 35, 22, 3).fill(COLORS.coral)

  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(7)
  doc.text('MISSION CONTROL · IDEA FINAL BRIEF', PAGE.marginX, PAGE.height - 30, { characterSpacing: 1.1 })

  if (context.section) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
    const label = context.step ? `PASO ${context.step} · ${context.section}` : context.section
    doc.text(truncate(label.toUpperCase(), 80), PAGE.marginX, 43, {
      width: CONTENT_WIDTH,
      characterSpacing: 0.8,
    })
  }
}

function addPage(doc: PDFKit.PDFDocument, context: PageContext = {}) {
  doc.addPage()
  drawPageChrome(doc, context)
  doc.y = PAGE.marginTop
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, context: PageContext = {}) {
  if (doc.y + needed <= CONTENT_BOTTOM) return
  addPage(doc, context)
}

function textHeight(doc: PDFKit.PDFDocument, value: string, width: number, fontSize = 9, lineGap = 2) {
  doc.font('Helvetica').fontSize(fontSize)
  return doc.heightOfString(value, { width, lineGap })
}

function drawLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number, width: number, color = COLORS.faint) {
  doc.fillColor(color).font('Helvetica-Bold').fontSize(7)
  doc.text(label.toUpperCase(), x, y, { width, characterSpacing: 0.8 })
}

function drawKeyValue(doc: PDFKit.PDFDocument, metric: IdeaBriefMetric, x: number, y: number, width: number, dark = false) {
  const bg = dark ? COLORS.bg2 : COLORS.surface
  const text = dark ? COLORS.white : COLORS.text
  const faint = dark ? '#aaa79c' : COLORS.faint
  const valueMax = width < 115 ? 26 : 42
  doc.roundedRect(x, y, width, 74, 10).fill(bg)
  doc.rect(x, y, 3, 74).fill(accentColor(metric.emphasis))
  drawLabel(doc, metric.label, x + 12, y + 12, width - 24, accentColor(metric.emphasis))
  doc.fillColor(text).font('Helvetica-Bold').fontSize(metric.value.length > 22 ? 10 : 13)
  doc.text(truncate(metric.value, valueMax), x + 12, y + 27, { width: width - 24, height: 18, lineGap: 1 })
  if (metric.detail) {
    doc.fillColor(faint).font('Helvetica').fontSize(7.2)
    doc.text(truncate(metric.detail, 54), x + 12, y + 51, { width: width - 24, height: 16, lineGap: 1 })
  }
}

function drawMetricRow(doc: PDFKit.PDFDocument, metrics: IdeaBriefMetric[], context: PageContext, dark = false) {
  if (metrics.length === 0) return
  ensureSpace(doc, 90, context)
  const visible = metrics.slice(0, 5)
  const gap = 8
  const width = (CONTENT_WIDTH - gap * (visible.length - 1)) / visible.length
  const y = doc.y
  visible.forEach((metric, index) => drawKeyValue(doc, metric, PAGE.marginX + index * (width + gap), y, width, dark))
  doc.y = y + 88
}

function drawCover(doc: PDFKit.PDFDocument, report: IdeaBriefReport) {
  drawPageChrome(doc)

  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(9)
  doc.text('IDEA REVIEW DOSSIER', PAGE.marginX, 68, { characterSpacing: 1.4 })

  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(32)
  doc.text(report.title, PAGE.marginX, 92, {
    width: CONTENT_WIDTH,
    lineGap: 2,
  })

  if (report.summary) {
    doc.moveDown(0.7)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(11)
    doc.text(truncate(report.summary, 420), {
      width: CONTENT_WIDTH,
      lineGap: 3,
    })
  }

  const cardY = Math.max(doc.y + 22, 244)
  const cardH = 188
  doc.roundedRect(PAGE.marginX, cardY, CONTENT_WIDTH, cardH, 16).fill(COLORS.bg2)
  doc.rect(PAGE.marginX, cardY, 5, cardH).fill(COLORS.acid)
  doc.circle(PAGE.width - PAGE.marginX - 28, cardY + 28, 5).fill(COLORS.coral)

  doc.fillColor(COLORS.acid).font('Helvetica-Bold').fontSize(8)
  doc.text('VEREDICTO HERMES', PAGE.marginX + 22, cardY + 22, { characterSpacing: 1.1 })
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
  doc.text(truncate(report.verdict || 'Sin veredicto explícito', 160), PAGE.marginX + 22, cardY + 42, {
    width: CONTENT_WIDTH - 44,
    lineGap: 3,
  })

  if (report.rationale) {
    doc.fillColor('#d9d9cf').font('Helvetica').fontSize(10)
    doc.text(truncate(report.rationale, 520), PAGE.marginX + 22, cardY + 96, {
      width: CONTENT_WIDTH - 44,
      height: 74,
      lineGap: 3,
    })
  }

  doc.y = cardY + cardH + 26
  drawMetricRow(doc, report.executiveHighlights, {}, false)

  const metaY = doc.y + 6
  const colWidth = (CONTENT_WIDTH - 24) / 3
  drawKeyValue(doc, { label: 'Estado', value: formatDate(report.approvedAt) }, PAGE.marginX, metaY, colWidth)
  drawKeyValue(doc, { label: 'Cobertura', value: `${report.completedSteps}/${report.totalSteps} pasos`, emphasis: 'acid' }, PAGE.marginX + colWidth + 12, metaY, colWidth)
  drawKeyValue(doc, { label: 'Fuente', value: 'JSON del wizard', detail: 'Sin recrear contenido', emphasis: 'blue' }, PAGE.marginX + (colWidth + 12) * 2, metaY, colWidth)

  doc.y = metaY + 105
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(13)
  doc.text('Mapa del análisis', PAGE.marginX, doc.y)
  let y = doc.y + 24
  const half = Math.ceil(report.sections.length / 2)
  report.sections.forEach((section, index) => {
    const col = index >= half ? 1 : 0
    const row = index >= half ? index - half : index
    const x = PAGE.marginX + col * (CONTENT_WIDTH / 2)
    const yy = y + row * 20
    doc.fillColor(section.stepIndex === report.totalSteps - 1 ? COLORS.coral : COLORS.acidDark).font('Helvetica-Bold').fontSize(8)
    doc.text(`${String(section.stepIndex + 1).padStart(2, '0')}`, x, yy, { width: 24 })
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
    doc.text(section.label, x + 28, yy, { width: CONTENT_WIDTH / 2 - 34 })
  })
}

function drawExecutiveBrief(doc: PDFKit.PDFDocument, report: IdeaBriefReport) {
  addPage(doc, { section: 'Executive brief' })
  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(24)
  doc.text('Resumen ejecutivo', PAGE.marginX, doc.y, { width: CONTENT_WIDTH })
  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(10)
  doc.text('Lectura rápida del caso antes de entrar al apéndice estructurado del wizard.', PAGE.marginX, doc.y + 8, {
    width: CONTENT_WIDTH,
    lineGap: 3,
  })
  doc.y += 22
  drawMetricRow(doc, report.executiveHighlights, { section: 'Executive brief' })

  const selected = [
    report.sections.find((section) => section.kind === 'problem-definition'),
    report.sections.find((section) => section.kind === 'customer-archetype'),
    report.sections.find((section) => section.kind === 'tam'),
    report.sections.find((section) => section.kind === 'go-no-go'),
  ].filter(Boolean) as IdeaBriefSection[]

  selected.forEach((section) => {
    ensureSpace(doc, 92, { section: 'Executive brief' })
    const y = doc.y
    doc.roundedRect(PAGE.marginX, y, CONTENT_WIDTH, 82, 12).fill(COLORS.surface)
    doc.rect(PAGE.marginX, y, 4, 82).fill(section.kind === 'go-no-go' ? COLORS.coral : COLORS.acid)
    drawLabel(doc, `PASO ${section.stepIndex + 1}`, PAGE.marginX + 14, y + 13, 70, section.kind === 'go-no-go' ? COLORS.coral : COLORS.acidDark)
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12)
    doc.text(section.label, PAGE.marginX + 92, y + 12, { width: CONTENT_WIDTH - 110 })
    const bullets = section.executiveSummary.length ? section.executiveSummary : section.fields.slice(0, 2).map((field) => `${field.label}: ${field.value}`)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8.5)
    doc.text(truncate(bullets.map((item) => `• ${item}`).join('\n'), 320), PAGE.marginX + 14, y + 34, {
      width: CONTENT_WIDTH - 28,
      height: 42,
      lineGap: 2,
    })
    doc.y = y + 96
  })
}

function drawSeverityMatrix(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'severity-matrix' }>, rect: ChartRect) {
  doc.roundedRect(rect.x, rect.y, rect.width, rect.height, 12).fill(COLORS.surface)
  doc.strokeColor(COLORS.border).lineWidth(0.8)
  doc.moveTo(rect.x + 38, rect.y + rect.height - 34).lineTo(rect.x + rect.width - 20, rect.y + rect.height - 34).stroke()
  doc.moveTo(rect.x + 38, rect.y + 18).lineTo(rect.x + 38, rect.y + rect.height - 34).stroke()

  for (let i = 1; i <= 3; i += 1) {
    const gx = rect.x + 38 + ((rect.width - 58) / 4) * i
    const gy = rect.y + 18 + ((rect.height - 52) / 4) * i
    doc.strokeColor('#e6e0d3').moveTo(gx, rect.y + 18).lineTo(gx, rect.y + rect.height - 34).stroke()
    doc.strokeColor('#e6e0d3').moveTo(rect.x + 38, gy).lineTo(rect.x + rect.width - 20, gy).stroke()
  }

  const px = rect.x + 38 + (clamp(chart.x, 0, 10) / 10) * (rect.width - 58)
  const py = rect.y + rect.height - 34 - (clamp(chart.y, 0, 10) / 10) * (rect.height - 52)
  doc.circle(px, py, 8).fill(COLORS.coral)
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8)
  doc.text(truncate(chart.label, 34), clamp(px + 12, rect.x + 44, rect.x + rect.width - 118), py - 7, { width: 110 })
  drawLabel(doc, chart.xLabel, rect.x + rect.width - 88, rect.y + rect.height - 22, 70)
  doc.save().rotate(-90, { origin: [rect.x + 14, rect.y + 100] })
  drawLabel(doc, chart.yLabel, rect.x + 14, rect.y + 100, 80)
  doc.restore()
}

function drawJourneyTimeline(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'journey-timeline' }>, rect: ChartRect) {
  doc.roundedRect(rect.x, rect.y, rect.width, rect.height, 12).fill(COLORS.surface)
  const gap = rect.width / chart.stages.length
  const baseY = rect.y + 48
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(rect.x + 28, baseY).lineTo(rect.x + rect.width - 28, baseY).stroke()
  chart.stages.forEach((stage, index) => {
    const x = rect.x + gap * index + gap / 2
    const score = stage.sentiment ?? 5
    const color = score >= 7 ? COLORS.acidDark : score <= 4 ? COLORS.coral : COLORS.blue
    doc.circle(x, baseY, 7).fill(color)
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(7.5)
    doc.text(stage.label, x - gap / 2 + 5, baseY + 15, { width: gap - 10, align: 'center' })
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(6.8)
    doc.text(truncate(stage.note || '—', 52), x - gap / 2 + 6, baseY + 36, { width: gap - 12, align: 'center', lineGap: 1 })
  })
}

function drawBmcGrid(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'bmc-grid' }>, rect: ChartRect) {
  const cols = 3
  const rows = 3
  const gap = 6
  const cellW = (rect.width - gap * (cols - 1)) / cols
  const cellH = (rect.height - gap * (rows - 1)) / rows
  chart.cells.slice(0, 9).forEach((cell, index) => {
    const x = rect.x + (index % cols) * (cellW + gap)
    const y = rect.y + Math.floor(index / cols) * (cellH + gap)
    doc.roundedRect(x, y, cellW, cellH, 8).fill(COLORS.surface)
    doc.rect(x, y, 3, cellH).fill(accentColor(cell.emphasis))
    drawLabel(doc, cell.label, x + 9, y + 9, cellW - 18, fieldColor(cell))
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(7.3)
    doc.text(truncate(cell.value, 98), x + 9, y + 25, { width: cellW - 18, height: cellH - 30, lineGap: 1 })
  })
}

function drawComparisonMatrix(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'comparison-matrix' }>, rect: ChartRect) {
  doc.roundedRect(rect.x, rect.y, rect.width, rect.height, 12).fill(COLORS.surface)
  const rowH = Math.min(40, (rect.height - 24) / Math.max(chart.competitors.length, 1))
  chart.competitors.slice(0, 5).forEach((competitor, index) => {
    const y = rect.y + 14 + index * rowH
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8)
    doc.text(competitor.name || `Alternativa ${index + 1}`, rect.x + 14, y, { width: 118 })
    doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(7)
    doc.text(competitor.type || '—', rect.x + 138, y, { width: 80 })
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(7.5)
    doc.text(truncate(competitor.edge || 'Sin gap registrado', 120), rect.x + 226, y, { width: rect.width - 240, lineGap: 1 })
    if (index < chart.competitors.length - 1) {
      doc.strokeColor('#e7e1d6').moveTo(rect.x + 14, y + rowH - 8).lineTo(rect.x + rect.width - 14, y + rowH - 8).stroke()
    }
  })
}

function drawBars(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'waterfall' | 'financial-bars' }>, rect: ChartRect) {
  doc.roundedRect(rect.x, rect.y, rect.width, rect.height, 12).fill(COLORS.surface)
  const max = Math.max(...chart.items.map((item) => Math.abs(item.value)), 1)
  const barAreaW = rect.width - 150
  const rowH = (rect.height - 26) / chart.items.length
  chart.items.forEach((item, index) => {
    const y = rect.y + 14 + index * rowH
    const barW = Math.max(2, (Math.abs(item.value) / max) * barAreaW)
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8)
    doc.text(item.label, rect.x + 14, y + 3, { width: 82 })
    doc.roundedRect(rect.x + 104, y + 2, barAreaW, 10, 5).fill('#ebe5d9')
    doc.roundedRect(rect.x + 104, y + 2, barW, 10, 5).fill(accentColor(item.emphasis))
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(7.5)
    doc.text(item.display, rect.x + rect.width - 72, y + 1, { width: 58, align: 'right' })
  })
}

function drawMarginStack(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'margin-stack' }>, rect: ChartRect) {
  const segmentW = rect.width / chart.items.length
  chart.items.forEach((item, index) => {
    const x = rect.x + index * segmentW
    doc.roundedRect(x + 3, rect.y, segmentW - 6, rect.height, 10).fill(index === 0 ? COLORS.bg2 : COLORS.surface)
    doc.rect(x + 3, rect.y, segmentW - 6, 4).fill(accentColor(item.emphasis))
    drawLabel(doc, item.label, x + 13, rect.y + 16, segmentW - 26, index === 0 ? COLORS.acid : fieldColor(item))
    doc.fillColor(index === 0 ? COLORS.white : COLORS.text).font('Helvetica-Bold').fontSize(8.5)
    doc.text(truncate(item.value, 72), x + 13, rect.y + 36, { width: segmentW - 26, height: rect.height - 44, lineGap: 2 })
  })
}

function drawScorecard(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'scorecard' }>, rect: ChartRect) {
  doc.roundedRect(rect.x, rect.y, rect.width, rect.height, 12).fill(COLORS.surface)
  const rowH = (rect.height - 22) / chart.items.length
  chart.items.forEach((item, index) => {
    const y = rect.y + 12 + index * rowH
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8)
    doc.text(item.label, rect.x + 14, y, { width: 78 })
    const score = item.score ?? 5
    doc.roundedRect(rect.x + 98, y + 2, 88, 7, 4).fill('#e7e1d6')
    doc.roundedRect(rect.x + 98, y + 2, clamp(score, 0, 10) * 8.8, 7, 4).fill(accentColor(item.emphasis))
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(7.3)
    doc.text(truncate(item.note || `${score}/10`, 100), rect.x + 198, y - 2, { width: rect.width - 210, lineGap: 1 })
  })
}

function drawDecisionMatrix(doc: PDFKit.PDFDocument, chart: Extract<IdeaBriefChartSpec, { type: 'decision-matrix' }>, rect: ChartRect) {
  drawSeverityMatrix(doc, {
    type: 'severity-matrix',
    x: chart.upside,
    y: chart.risk,
    label: chart.label,
    xLabel: 'Upside',
    yLabel: 'Riesgo',
  }, rect)
}

function drawChart(doc: PDFKit.PDFDocument, chart: IdeaBriefChartSpec | null | undefined, context: PageContext) {
  if (!chart) return
  const height = chart.type === 'bmc-grid' ? 245 : chart.type === 'margin-stack' ? 116 : 170
  ensureSpace(doc, height + 18, context)
  drawLabel(doc, 'GRÁFICA DETERMINÍSTICA', PAGE.marginX, doc.y, CONTENT_WIDTH, COLORS.faint)
  const rect = { x: PAGE.marginX, y: doc.y + 14, width: CONTENT_WIDTH, height }
  switch (chart.type) {
    case 'severity-matrix':
      drawSeverityMatrix(doc, chart, rect)
      break
    case 'journey-timeline':
      drawJourneyTimeline(doc, chart, rect)
      break
    case 'bmc-grid':
      drawBmcGrid(doc, chart, rect)
      break
    case 'comparison-matrix':
      drawComparisonMatrix(doc, chart, rect)
      break
    case 'waterfall':
    case 'financial-bars':
      drawBars(doc, chart, rect)
      break
    case 'margin-stack':
      drawMarginStack(doc, chart, rect)
      break
    case 'scorecard':
      drawScorecard(doc, chart, rect)
      break
    case 'decision-matrix':
      drawDecisionMatrix(doc, chart, rect)
      break
  }
  doc.y = rect.y + rect.height + 20
}

function splitTextToFit(
  doc: PDFKit.PDFDocument,
  value: string,
  width: number,
  maxHeight: number,
  fontSize: number,
  lineGap: number
) {
  const chunks: string[] = []
  const paragraphs = value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  let current = ''

  const fits = (text: string) => {
    doc.font('Helvetica').fontSize(fontSize)
    return doc.heightOfString(text, { width, lineGap }) <= maxHeight
  }

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  const pushWords = (paragraph: string) => {
    const words = paragraph.split(/\s+/).filter(Boolean)
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (fits(candidate)) {
        current = candidate
      } else {
        flush()
        current = word
      }
    }
  }

  for (const paragraph of paragraphs.length ? paragraphs : [value]) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (fits(candidate)) {
      current = candidate
      continue
    }
    flush()
    if (fits(paragraph)) {
      current = paragraph
    } else {
      pushWords(paragraph)
    }
  }
  flush()
  return chunks.length ? chunks : ['']
}

function drawSummary(doc: PDFKit.PDFDocument, section: IdeaBriefSection, context: PageContext) {
  if (section.executiveSummary.length === 0) return
  const text = section.executiveSummary.map((item) => `• ${item}`).join('\n')
  const contentWidth = CONTENT_WIDTH - 28
  const fontSize = 8.8
  const lineGap = 2
  let remaining = text
  let part = 1

  while (remaining.trim()) {
    ensureSpace(doc, 84, context)
    const available = Math.max(74, CONTENT_BOTTOM - doc.y - 14)
    const maxTextHeight = available - 38
    const [chunk, ...rest] = splitTextToFit(doc, remaining, contentWidth, maxTextHeight, fontSize, lineGap)
    const textBlock = chunk || remaining
    const height = textHeight(doc, textBlock, contentWidth, fontSize, lineGap) + 38
    const y = doc.y
    doc.roundedRect(PAGE.marginX, y, CONTENT_WIDTH, height, 10).fill(COLORS.bg2)
    doc.rect(PAGE.marginX, y, 4, height).fill(section.kind === 'go-no-go' ? COLORS.coral : COLORS.acid)
    drawLabel(
      doc,
      part === 1 ? 'SÍNTESIS EJECUTIVA DEL PASO' : 'SÍNTESIS EJECUTIVA · CONTINUACIÓN',
      PAGE.marginX + 14,
      y + 13,
      CONTENT_WIDTH - 28,
      COLORS.acid
    )
    doc.fillColor(COLORS.white).font('Helvetica').fontSize(fontSize)
    doc.text(textBlock, PAGE.marginX + 14, y + 30, { width: contentWidth, lineGap })
    doc.y = y + height + 14
    remaining = rest.join('\n\n')
    part += 1
  }
}

function drawFieldCard(
  doc: PDFKit.PDFDocument,
  field: IdeaBriefField,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  continuation = false
) {
  doc.roundedRect(x, y, width, height, 8).fill(COLORS.surface)
  doc.rect(x, y, 3, height).fill(accentColor(field.emphasis))
  drawLabel(doc, continuation ? `${field.label} · continuación` : field.label, x + 11, y + 10, width - 22, fieldColor(field))
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.2)
  doc.text(value, x + 11, y + 28, {
    width: width - 22,
    lineGap: 2,
  })
}

function fieldCardHeight(doc: PDFKit.PDFDocument, field: IdeaBriefField, width: number) {
  const labelHeight = doc.heightOfString(field.label.toUpperCase(), { width: width - 22 })
  return labelHeight + textHeight(doc, field.value, width - 22, 8.2, 2) + 42
}

function drawFullWidthField(doc: PDFKit.PDFDocument, field: IdeaBriefField, context: PageContext) {
  const width = CONTENT_WIDTH
  const contentWidth = width - 22
  const fontSize = 8.2
  const lineGap = 2
  let remaining = field.value
  let part = 1

  while (remaining.trim()) {
    const fullHeight = textHeight(doc, remaining, contentWidth, fontSize, lineGap) + 42
    const fullPageCapacity = CONTENT_BOTTOM - PAGE.marginTop - 10
    if (fullHeight <= fullPageCapacity && doc.y + fullHeight + 10 > CONTENT_BOTTOM) {
      addPage(doc, context)
    }

    ensureSpace(doc, 86, context)
    const available = Math.max(88, CONTENT_BOTTOM - doc.y - 10)
    const maxTextHeight = available - 42
    const chunks = splitTextToFit(doc, remaining, contentWidth, maxTextHeight, fontSize, lineGap)
    const chunk = chunks[0] || remaining
    const height = textHeight(doc, chunk, contentWidth, fontSize, lineGap) + 42
    drawFieldCard(doc, field, chunk, PAGE.marginX, doc.y, width, height, part > 1)
    doc.y += height + 10
    remaining = chunks.slice(1).join('\n\n')
    part += 1
  }
}

function drawShortFieldPair(doc: PDFKit.PDFDocument, left: IdeaBriefField, right: IdeaBriefField | null, context: PageContext) {
  const colGap = 10
  const colWidth = (CONTENT_WIDTH - colGap) / 2
  const leftHeight = fieldCardHeight(doc, left, colWidth)
  const rightHeight = right ? fieldCardHeight(doc, right, colWidth) : 0
  const height = Math.max(leftHeight, rightHeight, 74)
  ensureSpace(doc, height + 12, context)
  const y = doc.y
  drawFieldCard(doc, left, left.value, PAGE.marginX, y, colWidth, height)
  if (right) drawFieldCard(doc, right, right.value, PAGE.marginX + colWidth + colGap, y, colWidth, height)
  doc.y = y + height + 12
}

function drawFields(doc: PDFKit.PDFDocument, section: IdeaBriefSection, context: PageContext) {
  if (section.fields.length === 0) {
    ensureSpace(doc, 44, context)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(10)
    doc.text('Sin campos estructurados guardados para este paso.', PAGE.marginX, doc.y + 8)
    doc.y += 44
    return
  }

  drawLabel(doc, 'CAMPOS ESTRUCTURADOS · TEXTO COMPLETO', PAGE.marginX, doc.y, CONTENT_WIDTH)
  doc.y += 14

  let pendingSmall: IdeaBriefField | null = null
  const colWidth = (CONTENT_WIDTH - 10) / 2

  for (const field of section.fields) {
    const compactHeight = fieldCardHeight(doc, field, colWidth)
    const isSmall = field.value.length < 220 && field.label.length < 46 && compactHeight <= 112

    if (isSmall) {
      if (!pendingSmall) {
        pendingSmall = field
        continue
      }
      drawShortFieldPair(doc, pendingSmall, field, context)
      pendingSmall = null
      continue
    }

    if (pendingSmall) {
      drawShortFieldPair(doc, pendingSmall, null, context)
      pendingSmall = null
    }

    drawFullWidthField(doc, field, context)
  }

  if (pendingSmall) drawShortFieldPair(doc, pendingSmall, null, context)
}

function drawSection(doc: PDFKit.PDFDocument, section: IdeaBriefSection) {
  const context = { section: section.label, step: section.stepIndex + 1 }
  addPage(doc, context)

  const accent = section.kind === 'go-no-go' ? COLORS.coral : COLORS.acidDark
  doc.fillColor(accent).font('Helvetica-Bold').fontSize(9)
  doc.text(`PASO ${section.stepIndex + 1}`, PAGE.marginX, doc.y, { characterSpacing: 1.2 })
  doc.fillColor(COLORS.bg).font('Helvetica-Bold').fontSize(21)
  doc.text(section.label, PAGE.marginX, doc.y + 10, { width: CONTENT_WIDTH, lineGap: 2 })
  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(9.5)
  doc.text(section.hint, PAGE.marginX, doc.y + 7, { width: CONTENT_WIDTH, lineGap: 3 })

  if (section.owner) {
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7)
    doc.text(`OWNER · ${section.owner}`.toUpperCase(), PAGE.marginX, doc.y + 10, { characterSpacing: 0.8 })
    doc.y += 16
  } else {
    doc.y += 8
  }

  drawMetricRow(doc, section.metrics, context)
  drawChart(doc, section.chart, context)
  drawSummary(doc, section, context)
  drawFields(doc, section, context)
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
      Subject: 'Idea wizard deterministic final report',
    },
  })

  const chunks: Buffer[] = []
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  drawCover(doc, report)
  drawExecutiveBrief(doc, report)
  report.sections.forEach((section) => drawSection(doc, section))

  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8)
    doc.text(`${i + 1}/${range.count}`, PAGE.width - PAGE.marginX - 42, PAGE.height - 30, {
      width: 42,
      align: 'right',
    })
  }

  doc.end()
  return result
}
