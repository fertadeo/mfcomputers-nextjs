import type { CommercialBudgetDetail } from "@/lib/api"
import type { BudgetPdfModalData } from "@/components/budget-pdf-modal"

/**
 * Adapta un presupuesto comercial de la API al formato del modal/PDF legacy.
 * Montos sin desglose de IVA (totales de línea = precio × cantidad).
 */
export function commercialBudgetDetailToPdfData(detail: CommercialBudgetDetail): BudgetPdfModalData {
  const fechaIso = detail.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]
  const hasta = detail.valid_until || fechaIso

  const items: BudgetPdfModalData["items"] = detail.items.map((line) => {
    const isCustom = line.product_id == null
    const name = (line.description ?? line.product_name ?? "").trim() || line.product_name
    return {
      id: String(line.id),
      service: name,
      description: isCustom ? "" : line.product_code ? `Código: ${line.product_code}` : "",
      equipmentModel: isCustom ? undefined : line.product_code || undefined,
      quantity: line.quantity,
      vat: 0,
      unitPrice: line.unit_price,
      subtotal: line.total_price,
    }
  })

  return {
    id: String(detail.id),
    numero: detail.budget_number,
    cliente: detail.client_name?.trim() || `Cliente #${detail.client_id}`,
    email: detail.client_email ?? undefined,
    telefono: undefined,
    direccion: undefined,
    fecha: fechaIso,
    fechaVencimiento: hasta,
    estado: detail.status,
    items,
    subtotal: detail.total_amount,
    vat21: 0,
    vat105: 0,
    total: detail.total_amount,
    observaciones: detail.notes ?? undefined,
    validez: detail.valid_until ? undefined : 15,
    formaPago: undefined,
    vendedor: undefined,
  }
}
