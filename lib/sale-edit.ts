import type { Role } from "@/app/config/menu"
import type { SaleResponseData } from "@/lib/api"

const ROLES_EDITAR_VENTA: Role[] = ["admin", "gerencia", "ventas"]

export function canEditSale(
  sale: Pick<SaleResponseData, "arca_status">,
  hasAnyOfRoles: (roles: Role[]) => boolean
): boolean {
  return sale.arca_status !== "success" && hasAnyOfRoles(ROLES_EDITAR_VENTA)
}

export function saleHasFiscalLock(sale: Pick<SaleResponseData, "arca_status">): boolean {
  return sale.arca_status === "success"
}
