import {

  getFacturarSugerencia,

  getRepairOrderItems,

  getSale,

  parseFacturarSugerenciaDefaults,

  type FacturarSugerenciaIvaLine,

  type RepairOrderItem,

  type SaleItemResponse,

} from "@/lib/api"

import type { BillableRow } from "@/lib/facturacion-billables"

import { getSaleItemDisplayName } from "@/lib/sale-items"

import { normalizeSaleIvaRate, type SaleIvaRate } from "@/lib/sale-iva"



export interface FacturacionPreviewLine {

  description: string

  quantity: number

  unitPrice: number

  subtotal: number

  ivaRate: SaleIvaRate

  /** Neto gravado (desde sugerencia API o cálculo local). */

  neto?: number

  /** IVA discriminado de la línea. */

  iva?: number

}



export interface FacturacionPreviewResult {

  lines: FacturacionPreviewLine[]

  totalAmount?: number

  netoTotal?: number

  ivaTotal?: number

  /** Fecha comercial de la venta (desde sugerencia API). */

  saleDate?: string

  /** Fecha del comprobante que enviará el backend al facturar. */

  fechaCbte?: string

}



function parseMoney(value: string | number | undefined | null): number {

  if (typeof value === "number" && !Number.isNaN(value)) return value

  if (typeof value === "string") {

    const n = parseFloat(value.replace(",", "."))

    return Number.isNaN(n) ? 0 : n

  }

  return 0

}



function mapSugerenciaLine(line: FacturarSugerenciaIvaLine): FacturacionPreviewLine {

  const subtotal = parseMoney(line.lineTotal)

  const qty = line.quantity && line.quantity > 0 ? line.quantity : 1

  const unitPrice =

    line.unitPrice != null && line.unitPrice > 0

      ? parseMoney(line.unitPrice)

      : subtotal / qty



  return {

    description: line.descripcion,

    quantity: qty,

    unitPrice,

    subtotal,

    ivaRate: normalizeSaleIvaRate(line.ivaRate),

    neto: parseMoney(line.neto),

    iva: parseMoney(line.iva),

  }

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

      ivaRate: normalizeSaleIvaRate(item.iva_rate),

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

    ivaRate: normalizeSaleIvaRate(item.iva_rate),

  }))

  const labor = parseMoney(laborAmount)

  if (labor > 0) {

    lines.push({

      description: "Mano de obra",

      quantity: 1,

      unitPrice: labor,

      subtotal: labor,

      ivaRate: 21,

    })

  }

  return lines

}



/** Carga líneas de venta o reparación para el resumen previo a emitir en ARCA. */

export async function loadFacturacionPreviewLines(billable: BillableRow): Promise<FacturacionPreviewLine[]> {

  const result = await loadFacturacionPreview(billable)

  return result.lines

}

/** Formato legible para fechas YYYY-MM-DD o ISO de la API de facturación. */

export function formatFacturacionFecha(value?: string | null): string {

  if (!value?.trim()) return "—"

  const iso = value.trim().slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {

    const [y, m, d] = iso.split("-")

    return `${d}/${m}/${y}`

  }

  try {

    return new Date(value).toLocaleDateString("es-AR")

  } catch {

    return value

  }

}



/** Carga preview fiscal; para ventas intenta GET /facturar/sugerencia primero. */

export async function loadFacturacionPreview(billable: BillableRow): Promise<FacturacionPreviewResult> {

  if (billable.kind === "sale") {

    const saleId = billable.sale?.id ?? billable.id

    let fiscalDates: Pick<FacturacionPreviewResult, "saleDate" | "fechaCbte"> = {}

    try {

      const sugerencia = await getFacturarSugerencia(saleId)

      fiscalDates = parseFacturarSugerenciaDefaults(sugerencia)

      const desglose = sugerencia.ivaDesglose ?? []

      if (desglose.length > 0) {

        const lines = desglose.map(mapSugerenciaLine)

        const netoTotal = lines.reduce((acc, l) => acc + (l.neto ?? 0), 0)

        const ivaTotal = lines.reduce((acc, l) => acc + (l.iva ?? 0), 0)

        return {

          lines,

          totalAmount: parseMoney(sugerencia.totalAmount),

          netoTotal: Math.round(netoTotal * 100) / 100,

          ivaTotal: Math.round(ivaTotal * 100) / 100,

          ...fiscalDates,

        }

      }

    } catch {

      /* fallback a ítems de venta */

    }



    let items = billable.sale?.items

    let saleDateFallback: string | undefined

    if (!items?.length || !fiscalDates.saleDate) {

      const res = await getSale(saleId)

      if (!items?.length) items = res.data?.items ?? []

      saleDateFallback = res.data?.sale_date

    }

    return {

      lines: mapSaleItems(items ?? []),

      saleDate: fiscalDates.saleDate ?? saleDateFallback,

      fechaCbte: fiscalDates.fechaCbte,

    }

  }



  const order = billable.repairOrder

  if (billable.linkedSaleId) {

    try {

      const sugerencia = await getFacturarSugerencia(billable.linkedSaleId)

      const fiscalDates = parseFacturarSugerenciaDefaults(sugerencia)

      const desglose = sugerencia.ivaDesglose ?? []

      if (desglose.length > 0) {

        const lines = desglose.map(mapSugerenciaLine)

        return { lines, ...fiscalDates }

      }

      const res = await getSale(billable.linkedSaleId)

      const saleItems = res.data?.items ?? []

      if (saleItems.length > 0) {

        return {

          lines: mapSaleItems(saleItems),

          saleDate: fiscalDates.saleDate ?? res.data?.sale_date,

          fechaCbte: fiscalDates.fechaCbte,

        }

      }

    } catch {

      /* venta vinculada aún no disponible */

    }

  }



  let items = order?.items

  if (!items?.length) {

    const res = await getRepairOrderItems(billable.id)

    items = res.data ?? []

  }

  return { lines: mapRepairItems(items, order?.labor_amount) }

}

