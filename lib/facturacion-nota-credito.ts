import type { Sale } from "@/lib/api"

export function saleHasNotaCreditoEmitida(sale: Sale): boolean {
  return sale.arca_nc_status === "success" && Boolean(sale.arca_nc_cae?.trim())
}

/** Venta facturada que aún puede recibir NC (no emitida con éxito). */
export function canEmitNotaCredito(sale: Sale): boolean {
  if (sale.arca_status !== "success" || !sale.arca_cae?.trim()) return false
  if (saleHasNotaCreditoEmitida(sale)) return false
  return true
}
