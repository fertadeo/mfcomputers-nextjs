/**
 * PDF de presupuesto comercial para entregar al cliente (misma línea gráfica que la recepción de orden de reparación).
 */
import jsPDF from "jspdf"
import {
  COMMERCIAL_BUDGET_STATUS_LABELS,
  type CommercialBudgetDetail,
  type CommercialBudgetStatus,
} from "@/lib/api"

const LOGO_PATH = "/images/Recurso-8@3x.png"

const BRAND_BLUE: [number, number, number] = [29, 78, 158]
const BRAND_BLUE_DARK: [number, number, number] = [18, 52, 112]
const BRAND_BLUE_LIGHT: [number, number, number] = [232, 239, 250]
const GRAY_LINE: [number, number, number] = [226, 232, 240]
const TEXT_MUTED: [number, number, number] = [100, 116, 139]
const TEXT_BODY: [number, number, number] = [30, 41, 59]

const COMPANY = {
  name: "MFComputers",
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
  status_label: string
  emission_date: string
  valid_until: string | null
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddressLines?: string[]
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

function commercialBudgetStatusLabel(estado: string): string {
  const api = COMMERCIAL_BUDGET_STATUS_LABELS as Record<string, string>
  if (api[estado]) return api[estado]
  const legacy: Record<string, string> = {
    pendiente: "Pendiente",
    enviado: "Enviado",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    revision: "En revisión",
  }
  return legacy[estado] ?? estado
}

export function commercialPdfParamsFromModalInput(data: CommercialPdfFromModalInput): GenerateCommercialBudgetPdfParams {
  const lineItems: CommercialBudgetPdfLineItem[] = data.items.map((it) => ({
    product_name: it.service,
    product_code:
      it.equipmentModel?.trim() || it.description?.replace(/^Código:\s*/i, "").trim() || undefined,
    quantity: it.quantity,
    unit_price: it.unitPrice,
  }))

  return {
    budget_number: data.numero,
    status_label: commercialBudgetStatusLabel(data.estado),
    emission_date: data.fecha,
    valid_until: data.fechaVencimiento?.trim() ? data.fechaVencimiento : null,
    clientName: data.cliente,
    clientPhone: data.telefono,
    clientEmail: data.email,
    clientAddressLines: data.direccion ? [data.direccion] : undefined,
    lineItems,
    subtotal: data.subtotal,
    vat21: data.vat21,
    vat105: data.vat105,
    total: data.total,
    observaciones: data.observaciones,
  }
}

export function commercialPdfParamsFromApiDetail(detail: CommercialBudgetDetail): GenerateCommercialBudgetPdfParams {
  const lineItems: CommercialBudgetPdfLineItem[] = (detail.items || []).map((i) => ({
    product_name: i.product_name,
    product_code: i.product_code,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))

  return {
    budget_number: detail.budget_number,
    status_label: COMMERCIAL_BUDGET_STATUS_LABELS[detail.status as CommercialBudgetStatus] ?? detail.status,
    emission_date: detail.created_at.split("T")[0],
    valid_until: detail.valid_until ? detail.valid_until.split("T")[0] : null,
    clientName: detail.client_name?.trim() || `Cliente #${detail.client_id}`,
    clientEmail: detail.client_email ?? undefined,
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

export function generateCommercialBudgetPdf(params: GenerateCommercialBudgetPdfParams): void {
  if (typeof window === "undefined") return

  const doc = new jsPDF("p", "pt", "a4")
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 40
  const contentW = pageW - mx * 2
  const topY = 36

  const safeFile = String(params.budget_number || "presupuesto").replace(/[^\w\-]+/g, "-")

  const finish = (logoH: number) => {
    let y = topY

    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("PRESUPUESTO COMERCIAL", pageW - mx, y + (logoH > 0 ? 8 : 4), { align: "right" })

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Emitido: ${formatDateAr(params.emission_date)}`, pageW - mx, y + (logoH > 0 ? 28 : 22), {
      align: "right",
    })

    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEXT_BODY)
    doc.text(`N° ${params.budget_number}`, pageW - mx, y + (logoH > 0 ? 42 : 36), { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Estado: ${params.status_label}`, pageW - mx, y + (logoH > 0 ? 54 : 48), { align: "right" })
    if (params.valid_until) {
      doc.text(`Válido hasta: ${formatDateAr(params.valid_until)}`, pageW - mx, y + (logoH > 0 ? 64 : 58), {
        align: "right",
      })
    }

    y = topY + Math.max(logoH, 60) + 20

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
    doc.setTextColor(...TEXT_MUTED)
    doc.text(COMPANY.tagline, mx, y)
    y += 11
    doc.text(COMPANY.address, mx, y)
    y += 11
    doc.text(COMPANY.city, mx, y)

    let yRight = y - 22
    if (params.clientPhone?.trim()) {
      doc.text(`Tel: ${params.clientPhone.trim()}`, mx + colW + colGap, yRight)
      yRight += 11
    }
    if (params.clientEmail?.trim()) {
      doc.text(params.clientEmail.trim(), mx + colW + colGap, yRight)
      yRight += 11
    }
    if (params.clientAddressLines?.length) {
      params.clientAddressLines.forEach((line) => {
        if (line.trim()) {
          doc.text(line.trim(), mx + colW + colGap, yRight)
          yRight += 11
        }
      })
    }

    y = Math.max(y, yRight) + 8
    doc.line(mx, y, pageW - mx, y)
    y += 16

    const infoBoxH = 68
    doc.setFillColor(...BRAND_BLUE_LIGHT)
    doc.setDrawColor(...BRAND_BLUE)
    doc.setLineWidth(0.3)
    doc.roundedRect(mx, y, contentW, infoBoxH, 3, 3, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...BRAND_BLUE_DARK)
    doc.text("Sobre esta cotización", mx + 10, y + 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    const infoText =
      "Presupuesto de productos del catálogo. No reserva stock ni genera movimientos contables hasta su aprobación y conversión a venta. Los precios y disponibilidad se confirman al momento del cobro."
    drawWrapped(doc, infoText, mx + 10, y + 30, contentW - 20, 11, 4)

    y += infoBoxH + 18

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

        const title = item.product_name || "—"
        const subtitle = item.product_code ? `Código: ${item.product_code}` : ""
        const nameBlock = subtitle ? `${title}\n${subtitle}` : title
        const nameLines = doc.splitTextToSize(nameBlock, colUnit - colDesc - 10) as string[]
        const rowH = Math.max(22, 10 + nameLines.length * 11)

        doc.setFont("helvetica", "bold")
        doc.setTextColor(...TEXT_BODY)
        nameLines.forEach((line, i) => {
          doc.text(line, colDesc, y + 12 + i * 11)
        })
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...TEXT_MUTED)
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

    const sumX = pageW - mx - 140
    const valX = pageW - mx - 4

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_BODY)
    doc.text("Subtotal:", sumX, y, { align: "right" })
    doc.text(formatMoneyAr(params.subtotal), valX, y, { align: "right" })
    y += 14

    if (params.vat21 > 0) {
      doc.text("IVA 21%:", sumX, y, { align: "right" })
      doc.text(formatMoneyAr(params.vat21), valX, y, { align: "right" })
      y += 14
    }
    if (params.vat105 > 0) {
      doc.text("IVA 10,5%:", sumX, y, { align: "right" })
      doc.text(formatMoneyAr(params.vat105), valX, y, { align: "right" })
      y += 14
    }

    const totalBoxH = 28
    doc.setFillColor(...BRAND_BLUE)
    doc.rect(sumX - 20, y - 4, pageW - mx - (sumX - 20) + 4, totalBoxH, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text("TOTAL COTIZADO:", sumX, y + 12, { align: "right" })
    doc.text(formatMoneyAr(params.total), valX, y + 12, { align: "right" })

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
      "Documento de cotización comercial. No constituye factura fiscal ni comprobante de pago. El stock se descuenta al emitir la venta.",
      third - 6
    ) as string[]
    terms.forEach((t, i) => {
      doc.text(t, mx + third * 2, c3 + i * 8)
    })

    doc.save(`presupuesto-comercial-${safeFile}.pdf`)
  }

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
    finish(lh)
  }
  img.onerror = () => finish(0)
}
