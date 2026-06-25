import { describe, expect, it } from "vitest"
import { resolveCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"

describe("resolveCondicionIvaReceptorForWsfe", () => {
  it("monotributo (6) en Factura B se mantiene (no se convierte a 7)", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 6)).toBe(6)
    expect(resolveCondicionIvaReceptorForWsfe(8, 6)).toBe(6)
  })

  it("monotributo (6) en Factura C se mantiene", () => {
    expect(resolveCondicionIvaReceptorForWsfe(11, 6)).toBe(6)
  })

  it("RI (1) en Factura B se mantiene (la validación fiscal sugiere Factura A)", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 1)).toBe(1)
  })

  it("consumidor final (5) en Factura B se mantiene", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 5)).toBe(5)
  })
})
