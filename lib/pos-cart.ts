import type { CreateSaleItem, Product } from "@/lib/api"

export type PosCatalogCartLine = {
  kind: "catalog"
  product: Product
  quantity: number
  unit_price: number
}

export type PosCustomCartLine = {
  kind: "custom"
  lineId: string
  description: string
  quantity: number
  unit_price: number
}

export type PosCartLine = PosCatalogCartLine | PosCustomCartLine

export function getPosCartLineKey(line: PosCartLine): string {
  return line.kind === "catalog" ? `p-${line.product.id}` : `c-${line.lineId}`
}

export function getPosCartLineLabel(line: PosCartLine): string {
  return line.kind === "catalog" ? line.product.name : line.description
}

export function isPosCustomLine(line: PosCartLine): line is PosCustomCartLine {
  return line.kind === "custom"
}

export function posCartLineToCreateSaleItem(line: PosCartLine): CreateSaleItem {
  if (line.kind === "catalog") {
    return {
      product_id: line.product.id,
      quantity: line.quantity,
      unit_price: line.unit_price,
    }
  }
  return {
    description: line.description.trim(),
    quantity: line.quantity,
    unit_price: line.unit_price,
  }
}

export function newCustomLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
