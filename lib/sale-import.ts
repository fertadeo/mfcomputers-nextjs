import type { Sale, SaleResponseData } from "@/lib/api"

export type SaleSource = "pos" | "imported"

type SaleSourceCarrier = Pick<Sale, "sale_source"> | Pick<SaleResponseData, "sale_source">

export function isImportedSale(sale?: SaleSourceCarrier | null): boolean {
  return sale?.sale_source === "imported"
}

export const IMPORTED_SALE_BADGE = "Factura importada"

export const IMPORTED_SALE_FISCAL_HINT =
  "Comprobante registrado desde un PDF externo (ARCA u otro canal). No se puede emitir, reemitir ni anular por API desde el sistema; si necesitás una nota de crédito, gestionala directamente en ARCA."
