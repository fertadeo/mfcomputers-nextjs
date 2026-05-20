import {
  getProductById,
  getSale,
  type Cliente,
  type FacturarSaleRequest,
  type Sale,
  type SaleItemResponse,
} from "@/lib/api"
import { buildAfipQrUrl } from "@/lib/arca-invoice-afip-qr"
import { toNumber } from "@/lib/arca-invoice-format"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import {
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"

const EMISOR_DEFAULT = {
  razonSocial: "FIGUEROA MAXIMILIANO IVAN JESUS",
  domicilio: "Luther King 1095 - Santa Rosa, La Pampa",
  condicionIva: "IVA Responsable Inscripto",
  ingresosBrutos: "2275400",
  inicioActividades: "03/01/2011",
}

export interface BuildArcaInvoicePdfInputArgs {
  saleId: number
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
  cliente: Cliente | null
  saleSnapshot?: Sale | null
  /** Vista previa sin número AFIP: no lanza error; marca comprobante como incompleto. */
  previewAllowMissingNumero?: boolean
}

async function resolveProductNames(items: SaleItemResponse[]): Promise<Map<number, string>> {
  const ids = [...new Set(items.map((i) => i.product_id))]
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await getProductById(id)
        return [id, p.name] as const
      } catch {
        return [id, `Producto #${id}`] as const
      }
    })
  )
  return new Map(entries)
}

function lineSubtotal(item: SaleItemResponse): number {
  const fromApi = item.subtotal ?? item.total_price
  if (fromApi != null) return toNumber(fromApi)
  return toNumber(item.quantity) * toNumber(item.unit_price)
}

export async function buildArcaInvoicePdfInput(
  args: BuildArcaInvoicePdfInputArgs
): Promise<GenerateArcaInvoicePdfParams> {
  const { saleId, emision, facturarPayload, cliente, saleSnapshot, previewAllowMissingNumero } = args

  const saleRes = await getSale(saleId)
  const sale = saleRes.data
  const items = sale.items?.length ? sale.items : saleSnapshot?.items ?? []

  if (!items.length) {
    throw new Error("La venta no tiene ítems para armar el comprobante PDF.")
  }

  const names = await resolveProductNames(items)
  const tipo = toNumber(emision.tipo ?? facturarPayload.tipo, 6)
  const puntoVenta = toNumber(
    emision.puntoVenta ?? facturarPayload.puntoVenta ?? getStoredFacturacionPuntoVenta(),
    1
  )
  const numeroParsed = emision.numero != null ? toNumber(emision.numero, NaN) : NaN
  const numeroMissing = !Number.isFinite(numeroParsed) || numeroParsed < 1
  const numero = numeroMissing
    ? previewAllowMissingNumero
      ? 0
      : null
    : numeroParsed
  if (numero == null) {
    throw new Error(
      "No se encontró el número de comprobante AFIP. El backend debe persistir punto de venta y número en la venta, o exponer GET /api/sales/:id/comprobante-arca con la respuesta guardada del facturador."
    )
  }

  const docTipo = toNumber(facturarPayload.docTipo, 99)
  const docNro = toNumber(facturarPayload.docNro, 0)
  const condicionIva = facturarPayload.condicionIvaReceptor ?? 5
  const total = toNumber(emision.importe ?? sale.total_amount)
  const subtotalItems = items.reduce((acc, it) => acc + lineSubtotal(it), 0)
  const subtotal = Math.abs(subtotalItems - total) < 0.02 ? subtotalItems : total
  const ivaContenido = Math.round((total - total / 1.21) * 100) / 100

  const fechaEmision =
    emision.fechaEmision?.slice(0, 10) ??
    new Date(sale.sale_date || sale.created_at).toISOString().slice(0, 10)

  const cuitEmisor =
    emision.cuitEmisor?.replace(/\D/g, "") ||
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    ""

  const qrUrl =
    numeroMissing && previewAllowMissingNumero
      ? ""
      : emision.qrUrl ??
        buildAfipQrUrl({
          fechaEmision,
          cuitEmisor: cuitEmisor || "0",
          puntoVenta,
          tipoComprobante: tipo,
          numeroComprobante: numero,
          importe: total,
          docTipoReceptor: docTipo,
          docNroReceptor: docNro,
          cae: emision.cae,
        })

  const condicionLabels: Record<number, string> = {
    1: "IVA Responsable Inscripto",
    4: "IVA Sujeto Exento",
    5: "Consumidor Final",
    6: "Responsable Monotributo",
    9: "Cliente del Exterior",
    10: "IVA Liberado",
  }

  const receptorNombre =
    cliente?.name ?? saleSnapshot?.client_name ?? (docNro === 0 ? "" : "Consumidor final")

  return {
    emisor: {
      razonSocial: EMISOR_DEFAULT.razonSocial,
      domicilio: EMISOR_DEFAULT.domicilio,
      condicionIva: EMISOR_DEFAULT.condicionIva,
      cuit: cuitEmisor,
      ingresosBrutos: EMISOR_DEFAULT.ingresosBrutos,
      inicioActividades: EMISOR_DEFAULT.inicioActividades,
    },
    comprobante: {
      tipo,
      puntoVenta,
      numero,
      fechaEmision,
      concepto: (facturarPayload.concepto ?? 1) as 1 | 2 | 3,
    },
    receptor: {
      razonSocial: receptorNombre,
      docTipo,
      docNro,
      condicionIvaLabel: condicionLabels[condicionIva] ?? `Condición ${condicionIva}`,
      domicilio: [cliente?.address, cliente?.city].filter(Boolean).join(", ") || undefined,
    },
    items: items.map((item) => ({
      codigo: String(item.product_id),
      descripcion: names.get(item.product_id) ?? `Producto #${item.product_id}`,
      cantidad: toNumber(item.quantity),
      unidadMedida: "unidades",
      precioUnitario: toNumber(item.unit_price),
      bonificacionPct: 0,
      importeBonificacion: 0,
      subtotal: lineSubtotal(item),
    })),
    totales: {
      subtotal,
      otrosTributos: 0,
      total,
      ivaContenido: ivaContenido > 0 ? ivaContenido : null,
    },
    cae: emision.cae,
    caeVencimiento: emision.vencimientoCaeIso,
    qrUrl,
    condicionVenta: "Contado",
    pagina: "1/1",
    comprobanteIncompleto: numeroMissing && previewAllowMissingNumero,
  }
}
