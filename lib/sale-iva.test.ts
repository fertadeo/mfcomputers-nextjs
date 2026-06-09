import { describe, expect, it } from "vitest"
import {
  buildArcaIvaDiscriminado,
  computeSaleIvaBreakdown,
  ivaFromInclusiveAmount,
  normalizeSaleIvaRate,
} from "@/lib/sale-iva"

describe("sale-iva", () => {
  it("normaliza alícuotas válidas y usa 21% por defecto", () => {
    expect(normalizeSaleIvaRate(21)).toBe(21)
    expect(normalizeSaleIvaRate(10.5)).toBe(10.5)
    expect(normalizeSaleIvaRate(0)).toBe(0)
    expect(normalizeSaleIvaRate(undefined)).toBe(21)
    expect(normalizeSaleIvaRate("10.5")).toBe(10.5)
  })

  it("calcula IVA contenido desde precio final", () => {
    expect(ivaFromInclusiveAmount(121, 21)).toBe(21)
    expect(ivaFromInclusiveAmount(110.5, 10.5)).toBe(10.5)
    expect(ivaFromInclusiveAmount(100, 0)).toBe(0)
  })

  it("desglosa venta mixta por alícuota", () => {
    const breakdown = computeSaleIvaBreakdown([
      { subtotal: 121, iva_rate: 21 },
      { subtotal: 110.5, iva_rate: 10.5 },
      { subtotal: 50, iva_rate: 0 },
    ])
    expect(breakdown.iva21).toBe(21)
    expect(breakdown.iva105).toBe(10.5)
    expect(breakdown.ivaExento).toBe(50)
    expect(breakdown.ivaTotal).toBe(31.5)
    expect(breakdown.subtotalInclIva).toBe(281.5)
    expect(breakdown.netoGravado).toBe(250)
  })

  it("arma IVA discriminado ARCA con alícuotas AFIP en cero si no aplican", () => {
    const disc = buildArcaIvaDiscriminado([
      { subtotal: 121, iva_rate: 21 },
      { subtotal: 110.5, iva_rate: 10.5 },
    ])
    expect(disc.iva21).toBe(21)
    expect(disc.iva105).toBe(10.5)
    expect(disc.iva27).toBe(0)
    expect(disc.netoGravado).toBe(200)
  })
})
