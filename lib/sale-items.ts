import type { CreateSaleItem, SaleItemResponse } from "@/lib/api"
import type { SaleReceiptCartItem } from "@/lib/generate-sale-receipt-pdf"
import { posCartLineToCreateSaleItem, type PosCartLine } from "@/lib/pos-cart"

/** Nombre visible de una línea de venta (catálogo o manual). */
export function getSaleItemDisplayName(item: SaleItemResponse): string {
  const fromApi = item.product_name?.trim() || item.description?.trim()
  if (fromApi) return fromApi
  if (item.product_id != null && item.product_id > 0) {
    return `Producto #${item.product_id}`
  }
  return "Ítem"
}

export function isSaleCustomItem(item: SaleItemResponse): boolean {
  return item.product_id == null || item.product_id === 0
}

export function posCartLinesToCreateSaleItems(lines: PosCartLine[]): CreateSaleItem[] {
  return lines.map(posCartLineToCreateSaleItem)
}

export function posCartLinesToReceiptItems(lines: PosCartLine[]): SaleReceiptCartItem[] {
  return lines.map((line) => ({
    product: {
      id: line.kind === "catalog" ? line.product.id : 0,
      name: line.kind === "catalog" ? line.product.name : line.description,
    },
    quantity: line.quantity,
    unit_price: line.unit_price,
  }))
}

export function saleItemsToReceiptItems(
  items: SaleItemResponse[],
  nameByProductId?: Record<number, string>
): SaleReceiptCartItem[] {
  return items.map((item) => {
    const name =
      getSaleItemDisplayName(item) ||
      (item.product_id != null && nameByProductId?.[item.product_id]) ||
      "Ítem"
    return {
      product: { id: item.product_id ?? 0, name },
      quantity: item.quantity,
      unit_price: item.unit_price,
    }
  })
}

/** IDs de catálogo para prefetch (ítems manuales se excluyen). */
export function saleItemCatalogProductIds(items: SaleItemResponse[]): number[] {
  return [
    ...new Set(
      items
        .map((i) => i.product_id)
        .filter((id): id is number => id != null && id > 0)
    ),
  ]
}
