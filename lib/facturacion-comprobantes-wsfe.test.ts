import { describe, expect, it } from "vitest"
import { resolveCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"

describe("resolveCondicionIvaReceptorForWsfe", () => {
  it("monotributo (6) en Factura B pasa a condición 7 (no consumidor final)", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 6)).toBe(7)
    expect(resolveCondicionIvaReceptorForWsfe(8, 6)).toBe(7)
  })

  it("monotributo (6) en Factura C se mantiene", () => {
    expect(resolveCondicionIvaReceptorForWsfe(11, 6)).toBe(6)
  })

  it("RI (1) en Factura B no se normaliza", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 1)).toBe(1)
  })
})
