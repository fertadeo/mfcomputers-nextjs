import { getApiUrl } from "@/config/api"
import type { FacturarSaleRequest } from "@/lib/api"
import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { getTipoComprobanteLabel } from "@/lib/facturacion-comprobantes"
import type { FacturacionPreviewLine } from "@/lib/facturacion-preview-lines"
import { getStoredFacturacionCuitEmisor, getStoredFacturacionPuntoVenta } from "@/lib/facturacion-settings"
import {
  afipAlicuotaIdFromRate,
  computeSaleIvaBreakdown,
  formatSaleIvaRateLabel,
  netFromInclusiveAmount,
  splitIva,
} from "@/lib/sale-iva"

/** Misma fusión que `facturarSale` antes del POST (CUIT emisor y PV desde localStorage). */
export function mergeFacturarSaleRequestBody(body: FacturarSaleRequest): FacturarSaleRequest {
  const storedCuit = typeof window !== "undefined" ? getStoredFacturacionCuitEmisor() : null
  const storedPv = typeof window !== "undefined" ? getStoredFacturacionPuntoVenta() : undefined
  return {
    ...body,
    ...(body.cuitEmisor == null && storedCuit ? { cuitEmisor: storedCuit } : {}),
    ...(body.puntoVenta == null && storedPv != null ? { puntoVenta: storedPv } : {}),
  }
}

export interface FacturarHttpRequestPreview {
  method: "POST"
  url: string
  saleId: number
  body: FacturarSaleRequest
}

/** Vista previa del request HTTP que enviará `facturarSale` (sin cabeceras de auth). */
export function buildFacturarHttpRequestPreview(
  saleId: number,
  body: FacturarSaleRequest
): FacturarHttpRequestPreview {
  return {
    method: "POST",
    url: `${getApiUrl()}sales/${saleId}/facturar`,
    saleId,
    body: mergeFacturarSaleRequestBody(body),
  }
}

function conceptoLabel(concepto?: number): string {
  if (concepto === 2) return "Servicios"
  if (concepto === 3) return "Productos + servicios"
  return "Productos"
}

export interface FacturarFullPayloadPreviewReceptor {
  razonSocial: string
  docTipo: number
  docNro: number
  condicionIvaReceptor: number
  condicionIvaLabel: string
  taxConditionEnErp?: string | null
  domicilio?: string | null
}

export interface BuildFacturarFullPayloadPreviewArgs {
  saleId: number
  saleNumber?: string | null
  clientId?: number | null
  facturarPayload: FacturarSaleRequest
  lines: FacturacionPreviewLine[]
  receptor: FacturarFullPayloadPreviewReceptor
  saleDate?: string | null
  fechaCbte?: string | null
  totalAmount?: number | null
}

export interface FacturarFullPayloadPreview {
  descripcion: string
  nota: string
  httpRequest: FacturarHttpRequestPreview
  venta: {
    saleId: number
    saleNumber?: string | null
    clientId?: number | null
    saleDate?: string | null
    fechaComprobante?: string | null
  }
  emisor: {
    cuitEmisor?: string | null
    puntoVenta?: number | null
  }
  receptor: FacturarFullPayloadPreviewReceptor
  comprobante: {
    tipo: number
    tipoLabel: string
    concepto: number
    conceptoLabel: string
    fechaServicioDesde?: string | null
    fechaServicioHasta?: string | null
    force?: boolean
  }
  items: Array<{
    descripcion: string
    quantity: number
    unit_price: number
    iva_rate: number
    iva_rate_label: string
    alicuota_afip_id: number
    subtotal: number
    neto_gravado: number
    iva: number
    precio_unitario_neto: number
  }>
  totales: {
    neto_gravado: number
    iva_discriminado: number
    iva_21: number
    iva_10_5: number
    importe_exento: number
    importe_total: number
  }
}

/**
 * JSON completo para depuración: request HTTP + datos efectivos del comprobante.
 * Los ítems no van en el POST; el backend los toma de `sale_items` (misma fuente que esta preview).
 */
export function buildFacturarFullPayloadPreview(
  args: BuildFacturarFullPayloadPreviewArgs
): FacturarFullPayloadPreview {
  const body = mergeFacturarSaleRequestBody(args.facturarPayload)
  const tipo = body.tipo ?? 6
  const concepto = body.concepto ?? 1
  const condicion = body.condicionIvaReceptor ?? 5

  const items = args.lines.map((line) => {
    const neto = line.neto ?? splitIva(line.subtotal, line.ivaRate).neto
    const iva = line.iva ?? splitIva(line.subtotal, line.ivaRate).iva
    return {
      descripcion: line.description,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      iva_rate: line.ivaRate,
      iva_rate_label: formatSaleIvaRateLabel(line.ivaRate),
      alicuota_afip_id: afipAlicuotaIdFromRate(line.ivaRate),
      subtotal: line.subtotal,
      neto_gravado: Math.round(neto * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      precio_unitario_neto: Math.round(netFromInclusiveAmount(line.unitPrice, line.ivaRate) * 100) / 100,
    }
  })

  const ivaBreakdown = computeSaleIvaBreakdown(
    args.lines.map((line) => ({ subtotal: line.subtotal, iva_rate: line.ivaRate }))
  )
  const linesSubtotal = args.lines.reduce((acc, l) => acc + l.subtotal, 0)
  const importeTotal = args.totalAmount ?? linesSubtotal

  return {
    descripcion: "Vista previa del comprobante fiscal (frontend + venta ERP)",
    nota:
      "httpRequest.body es lo que envía el navegador en POST /sales/:id/facturar. " +
      "receptor, items y totales reflejan lo que el backend debería armar desde la venta " +
      "(sale_items + datos fiscales); no van en el body del POST.",
    httpRequest: {
      method: "POST",
      url: `${getApiUrl()}sales/${args.saleId}/facturar`,
      saleId: args.saleId,
      body,
    },
    venta: {
      saleId: args.saleId,
      saleNumber: args.saleNumber,
      clientId: args.clientId,
      saleDate: args.saleDate,
      fechaComprobante: args.fechaCbte,
    },
    emisor: {
      cuitEmisor: body.cuitEmisor ?? getStoredFacturacionCuitEmisor(),
      puntoVenta: body.puntoVenta ?? getStoredFacturacionPuntoVenta() ?? null,
    },
    receptor: args.receptor,
    comprobante: {
      tipo,
      tipoLabel: getTipoComprobanteLabel(tipo),
      concepto,
      conceptoLabel: conceptoLabel(concepto),
      fechaServicioDesde: body.fechaServicioDesde ?? null,
      fechaServicioHasta: body.fechaServicioHasta ?? null,
      force: body.force ?? false,
    },
    items,
    totales: {
      neto_gravado: Math.round(ivaBreakdown.netoGravado * 100) / 100,
      iva_discriminado: Math.round(ivaBreakdown.ivaTotal * 100) / 100,
      iva_21: Math.round(ivaBreakdown.iva21 * 100) / 100,
      iva_10_5: Math.round(ivaBreakdown.iva105 * 100) / 100,
      importe_exento: Math.round(ivaBreakdown.ivaExento * 100) / 100,
      importe_total: Math.round(importeTotal * 100) / 100,
    },
  }
}
