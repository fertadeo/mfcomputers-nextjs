import { describe, expect, it } from "vitest"
import { normalizeCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"

describe("normalizeCondicionIvaReceptorForWsfe", () => {
  it("monotributo (6) en Factura B pasa a condición 5", () => {
    expect(normalizeCondicionIvaReceptorForWsfe(6, 6)).toBe(5)
    expect(normalizeCondicionIvaReceptorForWsfe(8, 6)).toBe(5)
  })

  it("monotributo (6) en Factura C se mantiene", () => {
    expect(normalizeCondicionIvaReceptorForWsfe(11, 6)).toBe(6)
  })

  it("RI (1) en Factura B no se normaliza", () => {
    expect(normalizeCondicionIvaReceptorForWsfe(6, 1)).toBe(1)
  })
})
