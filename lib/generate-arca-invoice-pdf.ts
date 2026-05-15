/**
 * PDF de factura electrónica con diseño alineado al comprobante AFIP/ARCA (ORIGINAL).
 * Usa datos de emisión (CAE, QR, PV, número) devueltos por la API.
 */
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import QRCode from "qrcode"
import {
  formatCuitAfip,
  formatNumeroComprobanteAfip,
  formatPuntoVentaAfip,
  getCodigoComprobanteAfip,
  getLetraComprobanteAfip,
} from "@/lib/facturacion-comprobantes"

export interface ArcaInvoiceEmisor {
  razonSocial: string
  nombreFantasia?: string
  domicilio: string
  condicionIva: string
  cuit: string
  ingresosBrutos?: string
  inicioActividades?: string
}

export interface ArcaInvoiceReceptor {
  razonSocial: string
  docTipo: number
  docTipoLabel: string
  docNro: number
  condicionIva: number
  condicionIvaLabel: string
  domicilio?: string
}

export interface ArcaInvoiceLineItem {
  codigo?: string
  descripcion: string
  cantidad: number
  unidadMedida?: string
  precioUnitario: number
  bonificacionPct?: number
  subtotal: number
}

export interface GenerateArcaInvoicePdfParams {
  emisor: ArcaInvoiceEmisor
  comprobante: {
    tipo: number
    letra?: string
    puntoVenta: number
    numero: number
    fechaEmision: string
    concepto: 1 | 2 | 3
  }
  receptor: ArcaInvoiceReceptor
  items: ArcaInvoiceLineItem[]
  totales: {
    netoGravado: number
    iva21: number
    otrosTributos?: number
    total: number
  }
  cae: string
  caeVencimiento?: string | null
  qrUrl: string
  copia?: "ORIGINAL" | "DUPLICADO" | "TRIPLICADO"
}

const CONCEPTO_LABEL: Record<number, string> = {
  1: "Productos",
  2: "Servicios",
  3: "Productos y Servicios",
}

const money = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDateAr = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

const fmtDateCaeVto = (iso?: string | null) => {
  if (!iso) return "—"
  return fmtDateAr(iso)
}

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 140, margin: 0, errorCorrectionLevel: "M" })
}

export async function buildArcaInvoicePdf(
  params: GenerateArcaInvoicePdfParams
): Promise<{ doc: jsPDF; fileName: string }> {
  if (typeof window === "undefined") {
    throw new Error("PDF ARCA solo disponible en el navegador")
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 10
  const innerW = pageW - margin * 2
  const tipo = params.comprobante.tipo
  const letra = params.comprobante.letra ?? getLetraComprobanteAfip(tipo)
  const codigo = getCodigoComprobanteAfip(tipo)
  const copia = params.copia ?? "ORIGINAL"

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)
  doc.rect(margin, margin, innerW, 277)

  const headerTop = margin + 4
  const headerH = 52
  const midX = margin + innerW / 2
  const letterBoxSize = 14

  doc.line(midX, headerTop, midX, headerTop + headerH)

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text(copia, margin + 4, headerTop + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  let yLeft = headerTop + 10
  const leftColW = innerW / 2 - letterBoxSize / 2 - 8
  const leftX = margin + 4

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(params.emisor.razonSocial, leftX, yLeft, { maxWidth: leftColW })
  yLeft += 5
  if (params.emisor.nombreFantasia) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(params.emisor.nombreFantasia, leftX, yLeft, { maxWidth: leftColW })
    yLeft += 4
  }
  doc.setFontSize(7.5)
  doc.text(`Domicilio Comercial: ${params.emisor.domicilio}`, leftX, yLeft, { maxWidth: leftColW })
  yLeft += 8
  doc.text(`Condición frente al IVA: ${params.emisor.condicionIva}`, leftX, yLeft, { maxWidth: leftColW })
  yLeft += 4
  doc.text(`CUIT: ${formatCuitAfip(params.emisor.cuit)}`, leftX, yLeft)
  yLeft += 4
  doc.text(`Ingresos Brutos: ${params.emisor.ingresosBrutos ?? "—"}`, leftX, yLeft)
  yLeft += 4
  doc.text(`Fecha de Inicio de Actividades: ${params.emisor.inicioActividades ?? "—"}`, leftX, yLeft)

  const letterX = midX - letterBoxSize / 2
  const letterY = headerTop + 10
  doc.setLineWidth(0.6)
  doc.rect(letterX, letterY, letterBoxSize, letterBoxSize)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text(letra, midX, letterY + letterBoxSize / 2 + 2, { align: "center" })
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("COD.", midX, letterY + letterBoxSize + 4, { align: "center" })
  doc.text(codigo, midX, letterY + letterBoxSize + 8, { align: "center" })

  const rightX = midX + 6
  let yRight = headerTop + 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  const tipoNombre =
    tipo === 6 ? "FACTURA" : tipo === 11 ? "FACTURA" : tipo === 1 ? "FACTURA" : "COMPROBANTE"
  doc.text(tipoNombre, rightX, yRight)
  yRight += 10
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Punto de Venta: ${formatPuntoVentaAfip(params.comprobante.puntoVenta)}`, rightX, yRight)
  yRight += 4
  doc.text(`Comp. Nro: ${formatNumeroComprobanteAfip(params.comprobante.numero)}`, rightX, yRight)
  yRight += 4
  doc.text(`Fecha de Emisión: ${fmtDateAr(params.comprobante.fechaEmision)}`, rightX, yRight)

  const block2Y = headerTop + headerH + 2
  doc.line(margin, block2Y, margin + innerW, block2Y)

  const block2H = 28
  doc.line(margin, block2Y + block2H, margin + innerW, block2Y + block2H)
  doc.line(midX, block2Y, midX, block2Y + block2H)

  doc.setFontSize(7.5)
  let yRec = block2Y + 5
  doc.setFont("helvetica", "bold")
  doc.text("CUIT / DNI / Doc.: ", margin + 4, yRec)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${params.receptor.docTipoLabel}: ${params.receptor.docNro === 0 ? "0" : params.receptor.docNro}`,
    margin + 32,
    yRec
  )
  yRec += 4
  doc.setFont("helvetica", "bold")
  doc.text("Apellido y Nombre / Razón Social: ", margin + 4, yRec)
  doc.setFont("helvetica", "normal")
  doc.text(params.receptor.razonSocial, margin + 52, yRec, { maxWidth: innerW / 2 - 54 })
  yRec += 4
  if (params.receptor.domicilio) {
    doc.setFont("helvetica", "bold")
    doc.text("Domicilio: ", margin + 4, yRec)
    doc.setFont("helvetica", "normal")
    doc.text(params.receptor.domicilio, margin + 22, yRec, { maxWidth: innerW / 2 - 24 })
    yRec += 4
  }
  doc.setFont("helvetica", "bold")
  doc.text("Condición frente al IVA: ", margin + 4, yRec)
  doc.setFont("helvetica", "normal")
  doc.text(params.receptor.condicionIvaLabel, margin + 38, yRec)

  doc.text(`Concepto: ${CONCEPTO_LABEL[params.comprobante.concepto] ?? params.comprobante.concepto}`, rightX, block2Y + 6)
  doc.text("Condición de venta: Contado", rightX, block2Y + 11)

  const tableTop = block2Y + block2H + 2
  const tableBody = params.items.map((it) => [
    it.codigo ?? "",
    it.descripcion,
    String(it.cantidad),
    it.unidadMedida ?? "un",
    money(it.precioUnitario),
    `${it.bonificacionPct ?? 0}%`,
    money(0),
    money(it.subtotal),
  ])

  autoTable(doc, {
    startY: tableTop,
    margin: { left: margin, right: margin },
    head: [
      [
        "Código",
        "Producto / Servicio",
        "Cant.",
        "U. medida",
        "Precio Unit.",
        "% Bonif",
        "Imp. Bonif.",
        "Subtotal",
      ],
    ],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 52 },
      2: { halign: "right", cellWidth: 12 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 14 },
      6: { halign: "right", cellWidth: 18 },
      7: { halign: "right", cellWidth: 22 },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let yAfterTable = (doc as any).lastAutoTable?.finalY ?? tableTop + 40
  yAfterTable += 4

  const totalsX = margin + innerW - 70
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Importe Neto Gravado:", totalsX, yAfterTable)
  doc.text(money(params.totales.netoGravado), margin + innerW - 4, yAfterTable, { align: "right" })
  yAfterTable += 5
  doc.text("IVA 21%:", totalsX, yAfterTable)
  doc.text(money(params.totales.iva21), margin + innerW - 4, yAfterTable, { align: "right" })
  yAfterTable += 5
  if (params.totales.otrosTributos) {
    doc.text("Importe Otros Tributos:", totalsX, yAfterTable)
    doc.text(money(params.totales.otrosTributos), margin + innerW - 4, yAfterTable, { align: "right" })
    yAfterTable += 5
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Importe Total:", totalsX, yAfterTable)
  doc.text(money(params.totales.total), margin + innerW - 4, yAfterTable, { align: "right" })

  const footerY = Math.max(yAfterTable + 12, 248)
  doc.line(margin, footerY, margin + innerW, footerY)

  const qrImg = await qrDataUrl(params.qrUrl)
  const qrSize = 28
  doc.addImage(qrImg, "PNG", margin + 4, footerY + 4, qrSize, qrSize)

  const caeX = margin + qrSize + 10
  let yCae = footerY + 10
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("CAE N°:", caeX, yCae)
  doc.setFont("helvetica", "normal")
  doc.text(params.cae, caeX + 18, yCae)
  yCae += 5
  doc.setFont("helvetica", "bold")
  doc.text("Fecha de Vto. de CAE:", caeX, yCae)
  doc.setFont("helvetica", "normal")
  doc.text(fmtDateCaeVto(params.caeVencimiento), caeX + 38, yCae)

  doc.setFontSize(7)
  doc.setFont("helvetica", "italic")
  doc.text(
    "Comprobante Autorizado — Administración Federal de Ingresos Públicos",
    margin + innerW / 2,
    footerY + qrSize + 8,
    { align: "center" }
  )

  const fileName = `factura-${letra}-${formatPuntoVentaAfip(params.comprobante.puntoVenta)}-${formatNumeroComprobanteAfip(params.comprobante.numero)}.pdf`
  return { doc, fileName }
}

export async function generateArcaInvoicePdf(params: GenerateArcaInvoicePdfParams): Promise<void> {
  const { doc, fileName } = await buildArcaInvoicePdf(params)
  doc.save(fileName)
}

export async function generateArcaInvoicePdfFromBuildArgs(
  args: import("@/lib/build-arca-invoice-pdf-input").BuildArcaInvoicePdfInputArgs
): Promise<void> {
  const { buildArcaInvoicePdfInput } = await import("@/lib/build-arca-invoice-pdf-input")
  const input = await buildArcaInvoicePdfInput(args)
  await generateArcaInvoicePdf(input)
}
