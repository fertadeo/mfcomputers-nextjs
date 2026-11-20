/**
 * PDF de informe técnico de una orden de reparación.
 * Mismo encabezado que la recepción, sin ítems ni importes:
 * el cuerpo es el texto que redacta el técnico.
 */
import jsPDF from "jspdf"
import {
  parseEquipmentDescriptionString,
  formatEquipmentTypeDisplay,
} from "@/lib/repair-order-equipment"
import { drawDocumentClientePdfDetails } from "@/lib/document-cliente-pdf"
import { MF_COMPUTERS_COMPANY } from "@/lib/mf-computers-company"

const LOGO_PATH = "/images/Recurso-8@3x.png"

const BRAND_BLUE: [number, number, number] = [29, 78, 158]
const BRAND_BLUE_DARK: [number, number, number] = [18, 52, 112]
const BRAND_BLUE_LIGHT: [number, number, number] = [232, 239, 250]
const GRAY_LINE: [number, number, number] = [226, 232, 240]
const TEXT_MUTED: [number, number, number] = [100, 116, 139]
const TEXT_BODY: [number, number, number] = [30, 41, 59]

const COMPANY = MF_COMPUTERS_COMPANY

export interface GenerateRepairOrderTechnicalReportPdfParams {
  repair_number: string
  emission_date: string
  reception_date: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddressLines?: string[]
  clientCode?: string
  clientCuit?: string
  clientTaxCondition?: string
  equipment_description: string
  customer_declared_fault?: string
  technical_report: string
}

function formatDateAr(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  const slice = maxLines != null ? lines.slice(0, maxLines) : lines
  slice.forEach((line, i) => {
    doc.text(line, x, y + i * lineHeight)
  })
  return y + slice.length * lineHeight
}

function continuePage(doc: jsPDF, y: number, pageH: number, needed = 24): number {
  if (y + needed <= pageH - 64) return y
  doc.addPage()
  return 48
}

function drawFlowingText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  pageH: number,
  lineHeight = 13
): number {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n")
  paragraphs.forEach((paragraph) => {
    const lines = paragraph.trim()
      ? (doc.splitTextToSize(paragraph, maxWidth) as string[])
      : [""]
    lines.forEach((line) => {
      y = continuePage(doc, y, pageH, lineHeight)
      if (line) doc.text(line, x, y)
      y += line ? lineHeight : 8
    })
  })
  return y
}

function drawReport(doc: jsPDF, params: GenerateRepairOrderTechnicalReportPdfParams, logoH: number): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 40
  const contentW = pageW - mx * 2
  const topY = 36
  let y = topY

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("INFORME TÉCNICO", pageW - mx, y + (logoH > 0 ? 8 : 4), { align: "right" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(formatDateAr(params.emission_date), pageW - mx, y + (logoH > 0 ? 28 : 22), { align: "right" })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...TEXT_BODY)
  doc.text(`N° ${params.repair_number}`, pageW - mx, y + (logoH > 0 ? 44 : 38), { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("Sin cargo", pageW - mx, y + (logoH > 0 ? 58 : 52), { align: "right" })

  y = topY + Math.max(logoH, 64) + 18

  doc.setDrawColor(...GRAY_LINE)
  doc.setLineWidth(0.5)
  doc.line(mx, y, pageW - mx, y)
  y += 18

  const colGap = 24
  const colW = (contentW - colGap) / 2
  const rightX = mx + colW + colGap
  const blockTop = y

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("DATOS DEL LOCAL", mx, y)
  doc.text("CLIENTE", rightX, y)

  let leftY = y + 16
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_BODY)
  doc.text(COMPANY.name, mx, leftY)
  leftY += 13
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  const companyLines = [
    COMPANY.tagline,
    `Titular: ${COMPANY.legalName}`,
    `CUIT: ${COMPANY.cuit}`,
    `Celular: ${COMPANY.phone}`,
    COMPANY.address,
    COMPANY.city,
  ]
  companyLines.forEach((line) => {
    doc.text(line, mx, leftY)
    leftY += 11
  })

  let rightY = blockTop + 16
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_BODY)
  const clientNameLines = doc.splitTextToSize(params.clientName || "—", colW) as string[]
  clientNameLines.slice(0, 3).forEach((line) => {
    doc.text(line, rightX, rightY)
    rightY += 12
  })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  rightY = drawDocumentClientePdfDetails(doc, rightX, rightY, {
    clientCode: params.clientCode,
    clientCuit: params.clientCuit,
    clientPhone: params.clientPhone,
    clientEmail: params.clientEmail,
    clientAddressLines: params.clientAddressLines,
    clientTaxCondition: params.clientTaxCondition,
  })

  y = Math.max(leftY, rightY) + 8
  doc.setDrawColor(...GRAY_LINE)
  doc.line(mx, y, pageW - mx, y)
  y += 16

  const parsed = parseEquipmentDescriptionString(params.equipment_description)
  const innerW = contentW - 20
  let bodyLineCount = 3
  if (parsed.legacy) {
    const lines = doc.splitTextToSize(parsed.brandModel || "—", innerW) as string[]
    bodyLineCount = Math.min(Math.max(lines.length, 1), 6)
  }
  const equipBoxH = Math.max(72, 30 + bodyLineCount * 11 + 14)
  doc.setFillColor(...BRAND_BLUE_LIGHT)
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.3)
  doc.roundedRect(mx, y, contentW, equipBoxH, 3, 3, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...BRAND_BLUE_DARK)
  doc.text("Equipo recibido", mx + 10, y + 16)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_BODY)
  let ty = y + 30
  if (parsed.legacy) {
    drawWrapped(doc, parsed.brandModel || "—", mx + 10, ty, innerW, 11, 6)
  } else {
    doc.text(`Marca y modelo: ${parsed.brandModel || "—"}`, mx + 10, ty)
    ty += 12
    doc.text(`Tipo de equipo: ${formatEquipmentTypeDisplay(parsed)}`, mx + 10, ty)
    ty += 12
    doc.text(
      parsed.serialNumber.trim() ? `N.º de serie: ${parsed.serialNumber}` : "N.º de serie: —",
      mx + 10,
      ty
    )
  }
  y += equipBoxH + 14

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Recepción del equipo: ${formatDateAr(params.reception_date)}`, mx, y)
  y += 16

  if (params.customer_declared_fault?.trim()) {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEXT_BODY)
    doc.text("Falla declarada por el cliente", mx, y)
    y += 12
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    y = drawFlowingText(doc, params.customer_declared_fault.trim(), mx, y, contentW, pageH, 12)
    y += 8
  }

  y = continuePage(doc, y, pageH, 70)
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(mx, y, contentW, 22, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text("Informe del técnico", mx + 8, y + 14)
  y += 36

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_BODY)
  y = drawFlowingText(doc, params.technical_report.trim(), mx, y, contentW, pageH, 15)
  y += 18

  y = continuePage(doc, y, pageH, 36)
  doc.setFillColor(...BRAND_BLUE_LIGHT)
  doc.setDrawColor(...BRAND_BLUE)
  doc.roundedRect(mx, y, contentW, 32, 3, 3, "FD")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...BRAND_BLUE_DARK)
  const notice = doc.splitTextToSize(
    "Este informe no tiene cargo. No incluye repuestos ni mano de obra y no reemplaza un presupuesto ni una factura.",
    contentW - 16
  ) as string[]
  notice.slice(0, 2).forEach((line, index) => {
    doc.text(line, mx + 8, y + 13 + index * 11)
  })
  y += 48

  const footTop = pageH - 78
  if (y > footTop - 8) {
    doc.addPage()
    y = 48
  }
  y = Math.max(y, footTop)

  doc.setDrawColor(...GRAY_LINE)
  doc.line(mx, y, pageW - mx, y)
  y += 14

  const third = contentW / 3
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("Consultas", mx, y)
  doc.text("Alcance", mx + third, y)
  doc.text("Orden", mx + third * 2, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Celular: ${COMPANY.phone}`, mx, y + 12)
  doc.text(COMPANY.address, mx, y + 22)
  const scope = doc.splitTextToSize(
    "Documento informativo para el cliente. La recomendación la redacta el técnico.",
    third - 8
  ) as string[]
  scope.slice(0, 2).forEach((line, index) => {
    doc.text(line, mx + third, y + 12 + index * 9)
  })
  doc.text(params.repair_number, mx + third * 2, y + 12)
  doc.text(COMPANY.city, mx + third * 2, y + 22)
}

export function renderRepairOrderTechnicalReportPdf(
  params: GenerateRepairOrderTechnicalReportPdfParams,
  logo?: HTMLImageElement | null
): jsPDF {
  const doc = new jsPDF("p", "pt", "a4")
  let logoH = 0
  if (logo && logo.width) {
    const lw = 108
    logoH = (logo.height / logo.width) * lw
    try {
      doc.addImage(logo, "PNG", 40, 36, lw, logoH)
    } catch {
      logoH = 0
    }
  }
  drawReport(doc, params, logoH)
  return doc
}

export function generateRepairOrderTechnicalReportPdf(
  params: GenerateRepairOrderTechnicalReportPdfParams
): void {
  if (typeof window === "undefined") return

  const safeFile = String(params.repair_number || "orden").replace(/[^\w\-]+/g, "-")
  const save = (logo?: HTMLImageElement | null) => {
    const doc = renderRepairOrderTechnicalReportPdf(params, logo)
    doc.save(`informe-tecnico-${safeFile}.pdf`)
  }

  const img = new window.Image()
  img.crossOrigin = "anonymous"
  img.src = LOGO_PATH
  img.onload = () => save(img)
  img.onerror = () => save(null)
}
