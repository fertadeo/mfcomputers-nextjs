/**

 * PDF factura electrónica — diseño alineado al comprobante oficial ARCA/AFIP.

 * Por defecto genera triplicado: ORIGINAL, DUPLICADO y TRIPLICADO (3 páginas).

 */

import jsPDF from "jspdf"

import autoTable from "jspdf-autotable"

import QRCode from "qrcode"

import {

  ARCA_TABLE_HEADER_RGB,

  fmtDateAr,

  formatDocReceptor,

  moneyAr,

  moneyArWithSymbol,

} from "@/lib/arca-invoice-format"

import { drawArcaInvoiceHeader } from "@/lib/draw-arca-invoice-header"

import {

  formatNumeroComprobanteAfip,

  formatPuntoVentaAfip,

  getCodigoComprobanteAfip,

  getLetraComprobanteAfip,

} from "@/lib/facturacion-comprobantes"



export const FACTURA_COPIAS = ["ORIGINAL", "DUPLICADO", "TRIPLICADO"] as const

export type FacturaCopia = (typeof FACTURA_COPIAS)[number]



export interface ArcaInvoiceEmisor {

  razonSocial: string

  domicilio: string

  condicionIva: string

  cuit: string

  ingresosBrutos?: string

  inicioActividades?: string

}



export interface ArcaInvoiceReceptor {

  razonSocial: string

  docTipo: number

  docNro: number

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

  importeBonificacion?: number

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

    subtotal: number

    otrosTributos?: number

    total: number

    /** IVA contenido — Régimen de Transparencia Fiscal (Ley 27.743) */

    ivaContenido?: number | null

  }

  cae: string

  caeVencimiento?: string | null

  qrUrl: string

  /** Si false, solo genera la copia indicada en `copia` (o ORIGINAL). Por defecto true = triplicado. */

  triplicado?: boolean

  copia?: FacturaCopia

  condicionVenta?: string

  /** Texto entre comillas bajo totales, ej. nombre del emisor */

  firmaAutorizada?: string | null

  pagina?: string

}



async function qrDataUrl(text: string): Promise<string> {

  return QRCode.toDataURL(text, { width: 160, margin: 0, errorCorrectionLevel: "M" })

}



function drawLabelValue(

  doc: jsPDF,

  label: string,

  value: string,

  x: number,

  y: number,

  maxW: number

) {

  doc.setFont("helvetica", "bold")

  const lw = doc.getTextWidth(label)

  doc.text(label, x, y)

  doc.setFont("helvetica", "normal")

  const vx = x + lw + 1

  doc.text(value, vx, y, { maxWidth: Math.max(8, maxW - lw - 1) })

}



function resolveCopias(params: GenerateArcaInvoicePdfParams): FacturaCopia[] {

  if (params.triplicado === false) {

    return [params.copia ?? "ORIGINAL"]

  }

  return [...FACTURA_COPIAS]

}



async function drawInvoicePage(

  doc: jsPDF,

  params: GenerateArcaInvoicePdfParams,

  copia: FacturaCopia,

  qrImg: string,

  pageIndex: number,

  totalPages: number

): Promise<void> {

  const pageW = doc.internal.pageSize.getWidth()

  const margin = 8

  const innerW = pageW - margin * 2

  const tipo = params.comprobante.tipo

  const letra = params.comprobante.letra ?? getLetraComprobanteAfip(tipo)

  const codigo = getCodigoComprobanteAfip(tipo)

  const condicionVenta = params.condicionVenta ?? "Contado"

  const pagina =

    params.pagina ?? (totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : "1/1")



  doc.setDrawColor(0, 0, 0)

  doc.setLineWidth(0.25)



  let y = margin



  const pageH = doc.internal.pageSize.getHeight()

  const bottomY = pageH - margin

  doc.rect(margin, margin, innerW, bottomY - margin)



  y = drawArcaInvoiceHeader({
    doc,
    margin,
    innerW,
    startY: y,
    copia,
    emisor: params.emisor,
    comprobante: params.comprobante,
    letra,
    codigo,
  })



  const recH = 18

  doc.line(margin, y + recH, margin + innerW, y + recH)

  doc.line(margin + innerW / 2, y, margin + innerW / 2, y + recH)



  const recY1 = y + 5

  const halfW = innerW / 2 - 4

  drawLabelValue(

    doc,

    "Doc.: ",

    formatDocReceptor(params.receptor.docTipo, params.receptor.docNro),

    margin + 2,

    recY1,

    halfW

  )

  drawLabelValue(

    doc,

    "Apellido y Nombre / Razón Social: ",

    params.receptor.razonSocial || "",

    margin + innerW / 2 + 2,

    recY1,

    halfW

  )



  const recY2 = y + 10

  drawLabelValue(

    doc,

    "Condición frente al IVA: ",

    params.receptor.condicionIvaLabel,

    margin + 2,

    recY2,

    halfW

  )

  drawLabelValue(doc, "Domicilio: ", params.receptor.domicilio ?? "", margin + innerW / 2 + 2, recY2, halfW)



  const recY3 = y + 15

  drawLabelValue(doc, "Condición de venta: ", condicionVenta, margin + 2, recY3, innerW - 4)



  y += recH



  const tableBody = params.items.map((it) => [

    it.codigo ?? "",

    it.descripcion,

    moneyAr(it.cantidad),

    it.unidadMedida ?? "unidades",

    moneyAr(it.precioUnitario),

    moneyAr(it.bonificacionPct ?? 0),

    moneyAr(it.importeBonificacion ?? 0),

    moneyAr(it.subtotal),

  ])



  autoTable(doc, {

    startY: y,

    margin: { left: margin, right: margin },

    tableWidth: innerW,

    head: [

      [

        "Código",

        "Producto / Servicio",

        "Cantidad",

        "U. Medida",

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

      cellPadding: 1.5,

      lineColor: [0, 0, 0],

      lineWidth: 0.15,

      textColor: [0, 0, 0],

      valign: "middle",

    },

    headStyles: {

      fillColor: ARCA_TABLE_HEADER_RGB,

      textColor: [0, 0, 0],

      fontStyle: "bold",

      halign: "center",

      fontSize: 7,

    },

    columnStyles: {

      0: { cellWidth: 12, halign: "left" },

      1: { cellWidth: 48, halign: "left" },

      2: { cellWidth: 14, halign: "right" },

      3: { cellWidth: 16, halign: "center" },

      4: { cellWidth: 22, halign: "right" },

      5: { cellWidth: 14, halign: "right" },

      6: { cellWidth: 16, halign: "right" },

      7: { cellWidth: 22, halign: "right" },

    },

  })



  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  let yAfter = ((doc as any).lastAutoTable?.finalY as number) ?? y + 20



  const totalsBoxH = params.totales.ivaContenido != null ? 32 : 22

  const totalsBoxTop = yAfter

  doc.rect(margin, totalsBoxTop, innerW, totalsBoxH)



  const labelX = margin + innerW - 72

  let yT = totalsBoxTop + 6

  doc.setFontSize(8)

  doc.setFont("helvetica", "normal")



  const drawTotalLine = (label: string, amount: number, bold = false) => {

    if (bold) doc.setFont("helvetica", "bold")

    doc.text(label, labelX, yT)

    doc.text(moneyArWithSymbol(amount), margin + innerW - 2, yT, { align: "right" })

    doc.setFont("helvetica", "normal")

    yT += 5

  }



  drawTotalLine("Subtotal: $", params.totales.subtotal)

  drawTotalLine("Importe Otros Tributos: $", params.totales.otrosTributos ?? 0)

  drawTotalLine("Importe Total: $", params.totales.total, true)



  if (params.totales.ivaContenido != null) {

    const transY = totalsBoxTop + totalsBoxH - 12

    doc.setLineWidth(0.15)

    doc.line(margin + 2, transY - 2, margin + innerW - 2, transY - 2)

    doc.setFontSize(7)

    doc.setFont("helvetica", "bolditalic")

    const leyTitle = "Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)"

    doc.text(leyTitle, margin + 3, transY + 2)

    const tw = doc.getTextWidth(leyTitle)

    doc.setLineWidth(0.1)

    doc.line(margin + 3, transY + 2.8, margin + 3 + tw, transY + 2.8)

    doc.setFont("helvetica", "normal")

    doc.text("IVA Contenido: $", labelX, transY + 7)

    doc.text(moneyArWithSymbol(params.totales.ivaContenido), margin + innerW - 2, transY + 7, {

      align: "right",

    })

  }



  yAfter = totalsBoxTop + totalsBoxH + 4



  if (params.firmaAutorizada) {

    doc.setFontSize(9)

    doc.setFont("helvetica", "italic")

    doc.text(`"${params.firmaAutorizada}"`, margin + innerW / 2, yAfter + 3, { align: "center" })

    yAfter += 8

  }



  const footerTop = Math.max(yAfter, bottomY - 38)

  const qrSize = 26

  doc.addImage(qrImg, "PNG", margin + 3, footerTop, qrSize, qrSize)



  doc.setFontSize(8)

  doc.setFont("helvetica", "bold")

  doc.text("ARCA", margin + 3, footerTop + qrSize + 4)

  doc.setFontSize(7)

  doc.setFont("helvetica", "normal")

  doc.text("Comprobante Autorizado", margin + 3, footerTop + qrSize + 8)

  const disclaimer =

    "Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación"

  doc.setFontSize(5.5)

  doc.text(disclaimer, margin + 3, footerTop + qrSize + 12, { maxWidth: 70 })



  doc.setFontSize(8)

  doc.text(`Pág. ${pagina}`, margin + innerW / 2, footerTop + qrSize + 6, {

    align: "center",

  })



  const caeX = margin + innerW - 58

  doc.setFontSize(8)

  drawLabelValue(doc, "CAE N°: ", params.cae, caeX, footerTop + 4, 56)

  drawLabelValue(

    doc,

    "Fecha de Vto. de CAE: ",

    fmtDateAr(params.caeVencimiento ?? ""),

    caeX,

    footerTop + 10,

    56

  )

}



export async function buildArcaInvoicePdf(

  params: GenerateArcaInvoicePdfParams

): Promise<{ doc: jsPDF; fileName: string }> {

  if (typeof window === "undefined") {

    throw new Error("PDF ARCA solo disponible en el navegador")

  }



  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const tipo = params.comprobante.tipo

  const letra = params.comprobante.letra ?? getLetraComprobanteAfip(tipo)

  const copias = resolveCopias(params)

  const qrImg = await qrDataUrl(params.qrUrl)



  for (let i = 0; i < copias.length; i++) {

    if (i > 0) doc.addPage()

    await drawInvoicePage(doc, params, copias[i], qrImg, i, copias.length)

  }



  const suffix = copias.length > 1 ? "-triplicado" : ""

  const fileName = `factura-${letra}-${formatPuntoVentaAfip(params.comprobante.puntoVenta)}-${formatNumeroComprobanteAfip(params.comprobante.numero)}${suffix}.pdf`

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


