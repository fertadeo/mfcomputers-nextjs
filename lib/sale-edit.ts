import type { Role } from "@/app/config/menu"
import type { SaleResponseData } from "@/lib/api"
import { isImportedSale } from "@/lib/sale-import"

const ROLES_EDITAR_VENTA: Role[] = ["admin", "gerencia", "ventas"]

export function canEditSale(
  sale: Pick<SaleResponseData, "arca_status" | "sale_source">,
  hasAnyOfRoles: (roles: Role[]) => boolean
): boolean {
  if (isImportedSale(sale)) return false
  return sale.arca_status !== "success" && hasAnyOfRoles(ROLES_EDITAR_VENTA)
}

export function saleHasFiscalLock(sale: Pick<SaleResponseData, "arca_status">): boolean {
  return sale.arca_status === "success"
}
