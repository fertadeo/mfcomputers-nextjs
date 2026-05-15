import {
  getProductById,
  getSale,
  type Cliente,
  type FacturarSaleRequest,
  type Sale,
  type SaleItemResponse,
} from "@/lib/api"
import { buildAfipQrUrl } from "@/lib/arca-invoice-afip-qr"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import {
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"

const EMISOR_DEFAULT = {
  razonSocial: "MAXIMILIANO IVAN JESUS FIGUEROA",
  nombreFantasia: "MFComputers",
  domicilio: "Luther King 1095, Santa Rosa, La Pampa",
  condicionIva: "Responsable Monotributo",
  ingresosBrutos: "—",
  inicioActividades: "—",
}

export interface BuildArcaInvoicePdfInputArgs {
  saleId: number
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
  cliente: Cliente | null
  saleSnapshot?: Sale | null
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
  return item.subtotal ?? item.total_price ?? item.quantity * item.unit_price
}

export async function buildArcaInvoicePdfInput(
  args: BuildArcaInvoicePdfInputArgs
): Promise<GenerateArcaInvoicePdfParams> {
  const { saleId, emision, facturarPayload, cliente, saleSnapshot } = args

  const saleRes = await getSale(saleId)
  const sale = saleRes.data
  const items = sale.items?.length ? sale.items : saleSnapshot?.items ?? []

  if (!items.length) {
    throw new Error("La venta no tiene ítems para armar el comprobante PDF.")
  }

  const names = await resolveProductNames(items)
  const tipo = emision.tipo ?? facturarPayload.tipo ?? 6
  const puntoVenta =
    emision.puntoVenta ?? facturarPayload.puntoVenta ?? getStoredFacturacionPuntoVenta() ?? 1
  const numero = emision.numero
  if (numero == null || numero < 1) {
    throw new Error(
      "No se encontró el número de comprobante AFIP en la respuesta. Si la factura se emitió en esta sesión, volvé a abrir la venta desde la lista; si no, consultá el comprobante en MultiCUIT."
    )
  }
  const docTipo = facturarPayload.docTipo ?? 99
  const docNro = facturarPayload.docNro ?? 0
  const condicionIva = facturarPayload.condicionIvaReceptor ?? 5
  const total = emision.importe ?? sale.total_amount
  const fechaEmision =
    emision.fechaEmision?.slice(0, 10) ??
    new Date(sale.sale_date || sale.created_at).toISOString().slice(0, 10)

  const cuitEmisor =
    emision.cuitEmisor?.replace(/\D/g, "") ||
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    ""

  const qrUrl =
    emision.qrUrl ??
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

  const netoGravado = Math.round((total / 1.21) * 100) / 100
  const iva21 = Math.round((total - netoGravado) * 100) / 100

  const condicionLabels: Record<number, string> = {
    1: "IVA Responsable Inscripto",
    4: "IVA Sujeto Exento",
    5: "Consumidor Final",
    6: "Responsable Monotributo",
    9: "Cliente del Exterior",
    10: "IVA Liberado",
  }

  const docTipoLabels: Record<number, string> = {
    80: "CUIT",
    86: "CUIL",
    96: "DNI",
    99: "Sin identificar / Consumidor final",
  }

  return {
    emisor: {
      ...EMISOR_DEFAULT,
      cuit: cuitEmisor,
    },
    comprobante: {
      tipo,
      letra: undefined,
      puntoVenta,
      numero,
      fechaEmision,
      concepto: facturarPayload.concepto ?? 1,
    },
    receptor: {
      razonSocial: cliente?.name ?? saleSnapshot?.client_name ?? "Consumidor final",
      docTipo,
      docTipoLabel: docTipoLabels[docTipo] ?? `Tipo ${docTipo}`,
      docNro,
      condicionIva,
      condicionIvaLabel: condicionLabels[condicionIva] ?? `Condición ${condicionIva}`,
      domicilio:
        [cliente?.address, cliente?.city].filter(Boolean).join(", ") || undefined,
    },
    items: items.map((item) => ({
      codigo: String(item.product_id),
      descripcion: names.get(item.product_id) ?? `Producto #${item.product_id}`,
      cantidad: item.quantity,
      unidadMedida: "un",
      precioUnitario: item.unit_price,
      bonificacionPct: 0,
      subtotal: lineSubtotal(item),
    })),
    totales: {
      netoGravado,
      iva21,
      otrosTributos: 0,
      total,
    },
    cae: emision.cae,
    caeVencimiento: emision.vencimientoCaeIso,
    qrUrl,
    copia: "ORIGINAL",
  }
}
