import type { PosCartLine } from "@/lib/pos-cart"

export type SaleCurrency = "ARS" | "USD"

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}

export function arsToUsd(ars: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return roundUsd(ars / rate)
}

export function usdToArs(usd: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return roundUsd(usd * rate)
}

export function formatSaleMoney(
  value: number,
  currency: SaleCurrency,
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  if (currency === "USD") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
      maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
    })
  }
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  })
}

export function cartLineArsReference(line: PosCartLine): number {
  if (line.ars_unit_price != null) return line.ars_unit_price
  if (line.kind === "catalog") return line.product.price
  return line.unit_price
}

export function convertCartLineToUsd(line: PosCartLine, rate: number): PosCartLine {
  const ars = cartLineArsReference(line)
  return { ...line, ars_unit_price: ars, unit_price: arsToUsd(ars, rate) }
}

export function convertCartLineToArs(line: PosCartLine): PosCartLine {
  const ars = line.ars_unit_price ?? cartLineArsReference(line)
  const next = { ...line, unit_price: ars }
  delete (next as { ars_unit_price?: number }).ars_unit_price
  return next
}

export function recalcUsdCartLine(line: PosCartLine, rate: number): PosCartLine {
  const ars = line.ars_unit_price ?? cartLineArsReference(line)
  return { ...line, ars_unit_price: ars, unit_price: arsToUsd(ars, rate) }
}

export function applyUsdUnitPriceEdit(
  line: PosCartLine,
  unitPriceUsd: number,
  rate: number
): PosCartLine {
  const usd = roundUsd(unitPriceUsd)
  return {
    ...line,
    unit_price: usd,
    ars_unit_price: usdToArs(usd, rate),
  }
}
