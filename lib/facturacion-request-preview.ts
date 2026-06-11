import { getApiUrl } from "@/config/api"
import type { FacturarSaleRequest } from "@/lib/api"
import { getStoredFacturacionCuitEmisor, getStoredFacturacionPuntoVenta } from "@/lib/facturacion-settings"

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
