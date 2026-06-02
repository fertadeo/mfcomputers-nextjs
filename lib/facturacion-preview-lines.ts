import { getRepairOrderItems, getSale, type RepairOrderItem, type SaleItemResponse } from "@/lib/api"
import type { BillableRow } from "@/lib/facturacion-billables"
import { getSaleItemDisplayName } from "@/lib/sale-items"

export interface FacturacionPreviewLine {
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

function parseMoney(value: string | number | undefined | null): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", "."))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function mapSaleItems(items: SaleItemResponse[]): FacturacionPreviewLine[] {
  return items.map((item) => {
    const subtotal =
      item.subtotal ?? item.total_price ?? item.quantity * parseMoney(item.unit_price)
    return {
      description: getSaleItemDisplayName(item),
      quantity: item.quantity,
      unitPrice: parseMoney(item.unit_price),
      subtotal: parseMoney(subtotal),
    }
  })
}

function repairItemDescription(item: RepairOrderItem): string {
  return (
    item.product_name?.trim() ||
    item.description?.trim() ||
    item.product?.name?.trim() ||
    (item.product_id ? `Producto #${item.product_id}` : "Ítem")
  )
}

function mapRepairItems(items: RepairOrderItem[], laborAmount?: string | null): FacturacionPreviewLine[] {
  const lines: FacturacionPreviewLine[] = items.map((item) => ({
    description: repairItemDescription(item),
    quantity: item.quantity,
    unitPrice: parseMoney(item.unit_price),
    subtotal: parseMoney(item.total_price),
  }))
  const labor = parseMoney(laborAmount)
  if (labor > 0) {
    lines.push({
      description: "Mano de obra",
      quantity: 1,
      unitPrice: labor,
      subtotal: labor,
    })
  }
  return lines
}

/** Carga líneas de venta o reparación para el resumen previo a emitir en ARCA. */
export async function loadFacturacionPreviewLines(billable: BillableRow): Promise<FacturacionPreviewLine[]> {
  if (billable.kind === "sale") {
    const saleId = billable.sale?.id ?? billable.id
    let items = billable.sale?.items
    if (!items?.length) {
      const res = await getSale(saleId)
      items = res.data?.items ?? []
    }
    return mapSaleItems(items)
  }

  const order = billable.repairOrder
  if (billable.linkedSaleId) {
    try {
      const res = await getSale(billable.linkedSaleId)
      const saleItems = res.data?.items ?? []
      if (saleItems.length > 0) return mapSaleItems(saleItems)
    } catch {
      /* venta vinculada aún no disponible */
    }
  }

  let items = order?.items
  if (!items?.length) {
    const res = await getRepairOrderItems(billable.id)
    items = res.data ?? []
  }
  return mapRepairItems(items, order?.labor_amount)
}
