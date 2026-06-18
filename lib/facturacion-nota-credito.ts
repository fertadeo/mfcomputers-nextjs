import type { Sale } from "@/lib/api"
import { isImportedSale } from "@/lib/sale-import"

export function saleHasNotaCreditoEmitida(sale: Sale): boolean {
  return sale.arca_nc_status === "success" && Boolean(sale.arca_nc_cae?.trim())
}

/** Venta facturada que aún puede recibir NC por API (no importada, no emitida con éxito). */
export function canEmitNotaCredito(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  if (sale.arca_status !== "success" || !sale.arca_cae?.trim()) return false
  if (saleHasNotaCreditoEmitida(sale)) return false
  return true
}

/** Permite POST /sales/:id/facturar (emisión ARCA vía API). */
export function canFacturarSaleViaApi(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  return sale.arca_status !== "success"
}

/** Permite reemitir PDF / abrir flujo de emisión sobre comprobante ya registrado. */
export function canReemitirComprobante(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  return sale.arca_status === "success"
}
