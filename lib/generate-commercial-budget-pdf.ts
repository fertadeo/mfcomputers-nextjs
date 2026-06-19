/**
 * PDF de presupuesto comercial para entregar al cliente (misma línea gráfica que la recepción de orden de reparación).
 */
import jsPDF from "jspdf"
import type { CommercialBudgetDetail } from "@/lib/api"
import {
  documentClientePdfFromSnapshot,
  drawDocumentClientePdfDetails,
} from "@/lib/document-cliente-pdf"

const LOGO_PATH = "/images/Recurso-8@3x.png"

const BRAND_BLUE: [number, number, number] = [29, 78, 158]
const BRAND_BLUE_DARK: [number, number, number] = [18, 52, 112]
const BRAND_BLUE_LIGHT: [number, number, number] = [232, 239, 250]
const GRAY_LINE: [number, number, number] = [226, 232, 240]
const TEXT_MUTED: [number, number, number] = [100, 116, 139]
const TEXT_BODY: [number, number, number] = [30, 41, 59]

const COMPANY = {
  name: "MFComputers",
  legalName: "MAXIMILIANO IVAN JESUS FIGUEROA",
  cuit: "20-33998594-5",
  tagline: "Soluciones informáticas",
  address: "Luther King 1095",
  city: "Santa Rosa, La Pampa",
  phone: "",
  email: "",
}

export interface CommercialBudgetPdfLineItem {
  product_name: string
  product_code?: string
  quantity: number
  unit_price: number
}

export interface GenerateCommercialBudgetPdfParams {
  budget_number: string
  emission_date: string
  valid_until: string | null
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddressLines?: string[]
  clientCode?: string
  clientCuit?: string
  clientTaxCondition?: string
  lineItems: CommercialBudgetPdfLineItem[]
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
}

/** Formato mínimo compatible con `BudgetPdfModalData` (evita dependencia circular con el modal). */
export interface CommercialPdfFromModalInput {
  numero: string
  estado: string
  fecha: string
  fechaVencimiento: string
  cliente: string
  telefono?: string
  email?: string
  direccion?: string
  codigo?: string
  cuit?: string
  condicionFiscal?: string
  items: Array<{
    service: string
    description: string
    equipmentModel?: string
    quantity: number
    unitPrice: number
  }>
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
}

function commercialPdfLineProductCode(item: CommercialPdfFromModalInput["items"][number]): string | undefined {
  const model = item.equipmentModel?.trim()
  if (model && model !== "—") return model
  const fromDesc = item.description?.replace(/^Código:\s*/i, "").trim()
  if (!fromDesc || fromDesc === "—") return undefined
  return fromDesc
}

export function commercialPdfParamsFromModalInput(data: CommercialPdfFromModalInput): GenerateCommercialBudgetPdfParams {
  const lineItems: CommercialBudgetPdfLineItem[] = data.items.map((it) => ({
    product_name: it.service,
    product_code: commercialPdfLineProductCode(it),
    quantity: it.quantity,
    unit_price: it.unitPrice,
  }))

  return {
    budget_number: data.numero,
    emission_date: data.fecha,
    valid_until: data.fechaVencimiento?.trim() ? data.fechaVencimiento : null,
    clientName: data.cliente,
    clientPhone: data.telefono,
    clientEmail: data.email,
    clientAddressLines: data.direccion ? data.direccion.split(" · ") : undefined,
    clientCode: data.codigo,
    clientCuit: data.cuit,
    clientTaxCondition: data.condicionFiscal,
    lineItems,
    subtotal: data.subtotal,
    vat21: data.vat21,
    vat105: data.vat105,
    total: data.total,
    observaciones: data.observaciones,
  }
}

export function commercialPdfParamsFromApiDetail(detail: CommercialBudgetDetail): GenerateCommercialBudgetPdfParams {
  const clientFields = documentClientePdfFromSnapshot(detail)
  const lineItems: CommercialBudgetPdfLineItem[] = (detail.items || []).map((i) => {
    const isCustom = i.product_id == null
    const name = (i.description ?? i.product_name ?? "").trim() || i.product_name
    return {
      product_name: name,
      product_code: isCustom ? undefined : i.product_code?.trim() || undefined,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }
  })

  return {
    budget_number: detail.budget_number,
    emission_date: detail.created_at.split("T")[0],
    valid_until: detail.valid_until ? detail.valid_until.split("T")[0] : null,
    clientName: clientFields.clientName,
    clientPhone: clientFields.clientPhone,
    clientEmail: clientFields.clientEmail,
    clientAddressLines: clientFields.clientAddressLines,
    clientCode: clientFields.clientCode,
    clientCuit: clientFields.clientCuit,
    clientTaxCondition: clientFields.clientTaxCondition,
    lineItems,
    subtotal: detail.total_amount,
    vat21: 0,
    vat105: 0,
    total: detail.total_amount,
    observaciones: detail.notes ?? undefined,
  }
}

function formatMoneyAr(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
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

/** Ancho máximo de la columna descripción (evita pisar P. unit.) */
const PRODUCT_NAME_MAX_CHARS = 46

function ellipsizeToWidth(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontStyle: "normal" | "bold" = "normal"
): string {
  const trimmed = text.trim() || "—"
  if (trimmed.length > PRODUCT_NAME_MAX_CHARS) {
    text = `${trimmed.slice(0, PRODUCT_NAME_MAX_CHARS - 1).trimEnd()}…`
  } else {
    text = trimmed
  }
  doc.setFont("helvetica", fontStyle)
  if (doc.getTextWidth(text) <= maxWidth) return text
  const ellipsis = "…"
  let end = text.length
  while (end > 1 && doc.getTextWidth(text.slice(0, end - 1).trimEnd() + ellipsis) > maxWidth) {
    end -= 1
  }
  return end < text.length ? text.slice(0, end - 1).trimEnd() + ellipsis : text
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

function renderCommercialBudgetPdf(
  doc: jsPDF,
  params: GenerateCommercialBudgetPdfParams,
  logoH: number
): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 40
  const contentW = pageW - mx * 2
  const topY = 36

  let y = topY

  const headerLeftY0 = topY + (logoH > 0 ? logoH + 10 : 0)
  let headerLeftY = headerLeftY0
  if (logoH === 0) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_BLUE)
    doc.text(COMPANY.name, mx, headerLeftY)
    headerLeftY += 13
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_BODY)
  doc.text(COMPANY.legalName, mx, headerLeftY)
  headerLeftY += 11
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`CUIT: ${COMPANY.cuit}`, mx, headerLeftY)
  const headerLeftBottom = headerLeftY + 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("PRESUPUESTO", pageW - mx, y + (logoH > 0 ? 8 : 4), { align: "right" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Emitido: ${formatDateAr(params.emission_date)}`, pageW - mx, y + (logoH > 0 ? 28 : 22), {
    align: "right",
  })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...TEXT_BODY)
  doc.text(`N° ${params.budget_number}`, pageW - mx, y + (logoH > 0 ? 42 : 36), { align: "right" })

  if (params.valid_until) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Válido hasta: ${formatDateAr(params.valid_until)}`, pageW - mx, y + (logoH > 0 ? 54 : 48), {
      align: "right",
    })
  }

  y = topY + Math.max(logoH, headerLeftBottom - topY, params.valid_until ? 60 : 52) + 20

    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.5)
    doc.line(mx, y, pageW - mx, y)
    y += 18

    const colGap = 24
    const colW = (contentW - colGap) / 2

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("DATOS DEL LOCAL", mx, y)
    doc.text("CLIENTE", mx + colW + colGap, y)
    y += 12

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_BODY)
    doc.text(COMPANY.name, mx, y)
    doc.text(params.clientName || "—", mx + colW + colGap, y)
    y += 12

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    doc.text(COMPANY.legalName, mx, y)
    y += 11
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`CUIT: ${COMPANY.cuit}`, mx, y)
    y += 11
    doc.setFontSize(9)
    doc.text(COMPANY.tagline, mx, y)
    y += 11
    doc.text(COMPANY.address, mx, y)
    y += 11
    doc.text(COMPANY.city, mx, y)

    let yRight = y - 22
    yRight = drawDocumentClientePdfDetails(doc, mx + colW + colGap, yRight, {
      clientCode: params.clientCode,
      clientCuit: params.clientCuit,
      clientPhone: params.clientPhone,
      clientEmail: params.clientEmail,
      clientAddressLines: params.clientAddressLines,
      clientTaxCondition: params.clientTaxCondition,
    })

    y = Math.max(y, yRight) + 8
    doc.line(mx, y, pageW - mx, y)
    y += 16

    if (y > pageH - 220) {
      doc.addPage()
      y = 48
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.setFillColor(...BRAND_BLUE)
    const headH = 22
    doc.rect(mx, y, contentW, headH, "F")
    const colDesc = mx + 8
    const colUnit = mx + contentW * 0.5
    const colQty = mx + contentW * 0.72
    const colTot = pageW - mx - 8
    doc.text("Descripción", colDesc, y + 14)
    doc.text("P. unit.", colUnit, y + 14, { align: "right" })
    doc.text("Cant.", colQty, y + 14, { align: "right" })
    doc.text("Importe", colTot, y + 14, { align: "right" })

    y += headH + 4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)

    if (params.lineItems.length === 0) {
      doc.setTextColor(...TEXT_MUTED)
      doc.text("Sin ítems en este presupuesto.", colDesc, y + 10)
      y += 24
    } else {
      params.lineItems.forEach((item) => {
        const lineTotal = item.quantity * item.unit_price

        doc.setDrawColor(...GRAY_LINE)
        doc.setLineWidth(0.3)
        doc.line(mx, y, pageW - mx, y)
        y += 6

        const descMaxW = colUnit - colDesc - 14
        doc.setFontSize(9)
        const title = ellipsizeToWidth(doc, item.product_name || "—", descMaxW, "bold")
        const subtitle = item.product_code ? `Código: ${item.product_code.trim()}` : ""
        doc.setFont("helvetica", "normal")
        const subtitleLines = subtitle
          ? (doc.splitTextToSize(subtitle, descMaxW) as string[])
          : []
        const nameLineCount = 1 + subtitleLines.length
        const rowH = Math.max(22, 10 + nameLineCount * 11)

        doc.setFont("helvetica", "bold")
        doc.setTextColor(...TEXT_BODY)
        doc.text(title, colDesc, y + 12)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...TEXT_MUTED)
        subtitleLines.forEach((line, i) => {
          doc.text(line, colDesc, y + 12 + 11 + i * 11)
        })
        doc.setTextColor(...TEXT_BODY)
        doc.text(formatMoneyAr(item.unit_price), colUnit, y + 12, { align: "right" })
        doc.setTextColor(...TEXT_BODY)
        doc.text(String(item.quantity), colQty, y + 12, { align: "right" })
        doc.text(formatMoneyAr(lineTotal), colTot, y + 12, { align: "right" })

        y += rowH
      })
    }

    doc.setDrawColor(...GRAY_LINE)
    doc.line(mx, y, pageW - mx, y)
    y += 18

    const summaryValueX = pageW - mx - 8
    const summaryLabelX = pageW - mx - 108
    const summaryLineH = 13

    function drawSummaryRow(label: string, value: string, bold = false) {
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_BODY)
      doc.text(label, summaryLabelX, y, { align: "right" })
      doc.text(value, summaryValueX, y, { align: "right" })
      y += summaryLineH
    }

    drawSummaryRow("Subtotal", formatMoneyAr(params.subtotal))

    if (params.vat21 > 0) {
      drawSummaryRow("IVA 21%", formatMoneyAr(params.vat21))
    }
    if (params.vat105 > 0) {
      drawSummaryRow("IVA 10,5%", formatMoneyAr(params.vat105))
    }

    const totalBoxH = 24
    const totalBoxLeft = summaryLabelX - 14
    const totalBoxW = pageW - mx - totalBoxLeft
    doc.setFillColor(...BRAND_BLUE)
    doc.rect(totalBoxLeft, y, totalBoxW, totalBoxH, "F")
    const totalTextY = y + totalBoxH / 2 + 3.5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text("Total", summaryLabelX, totalTextY, { align: "right" })
    doc.text(formatMoneyAr(params.total), summaryValueX, totalTextY, { align: "right" })

    y += totalBoxH + 22

    if (params.observaciones?.trim()) {
      if (y > pageH - 160) {
        doc.addPage()
        y = 48
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_BODY)
      doc.text("Observaciones", mx, y)
      y += 12
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_MUTED)
      y = drawWrapped(doc, params.observaciones.trim(), mx, y, contentW, 11)
      y += 16
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Gracias por confiar en nosotros", mx, y)
    y += 22

    const footTop = pageH - 72
    if (y > footTop - 10) {
      doc.addPage()
      y = 48
    }
    y = Math.max(y, footTop)

    doc.setDrawColor(...GRAY_LINE)
    doc.line(mx, y, pageW - mx, y)
    y += 10

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    const third = contentW / 3
    let c1 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Consultas", mx, c1)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c1 += 9
    if (COMPANY.email) {
      doc.text(`Email: ${COMPANY.email}`, mx, c1)
      c1 += 8
    } else {
      doc.text("Acercate al local o escribinos por los canales habituales.", mx, c1)
      c1 += 8
    }
    if (COMPANY.phone) {
      doc.text(`Tel: ${COMPANY.phone}`, mx, c1)
      c1 += 8
    }

    let c2 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Validez", mx + third, c2)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c2 += 9
    const validityMsg = params.valid_until
      ? `Oferta con vigencia hasta ${formatDateAr(params.valid_until)}.`
      : "Consultá vigencia de precios y stock al momento de confirmar."
    c2 = drawWrapped(doc, validityMsg, mx + third, c2, third - 6, 8, 5)

    let c3 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Términos", mx + third * 2, c3)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c3 += 9
    const terms = doc.splitTextToSize(
      "Documento de presupuesto. No constituye factura fiscal ni comprobante de pago. El stock se descuenta al emitir la venta.",
      third - 6
    ) as string[]
    terms.forEach((t, i) => {
      doc.text(t, mx + third * 2, c3 + i * 8)
    })
}

export function buildCommercialBudgetPdf(
  params: GenerateCommercialBudgetPdfParams
): Promise<{ doc: jsPDF; safeFile: string }> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF solo disponible en el navegador"))
  }

  const doc = new jsPDF("p", "pt", "a4")
  const mx = 40
  const topY = 36
  const safeFile = String(params.budget_number || "presupuesto").replace(/[^\w\-]+/g, "-")

  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = LOGO_PATH
    img.onload = () => {
      const lw = 108
      const lh = img.width ? (img.height / img.width) * lw : 56
      try {
        doc.addImage(img, "PNG", mx, topY, lw, lh)
      } catch {
        /* continuar sin logo */
      }
      renderCommercialBudgetPdf(doc, params, lh)
      resolve({ doc, safeFile })
    }
    img.onerror = () => {
      renderCommercialBudgetPdf(doc, params, 0)
      resolve({ doc, safeFile })
    }
  })
}

export async function getCommercialBudgetPdfBlob(params: GenerateCommercialBudgetPdfParams): Promise<Blob> {
  const { doc } = await buildCommercialBudgetPdf(params)
  return doc.output("blob")
}

export async function generateCommercialBudgetPdf(params: GenerateCommercialBudgetPdfParams): Promise<void> {
  const { doc, safeFile } = await buildCommercialBudgetPdf(params)
  doc.save(`presupuesto-${safeFile}.pdf`)
}
