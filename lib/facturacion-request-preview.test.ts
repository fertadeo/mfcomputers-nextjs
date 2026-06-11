import { describe, expect, it } from "vitest"
import { mergeFacturarSaleRequestBody } from "@/lib/facturacion-request-preview"

describe("facturacion-request-preview", () => {
  it("conserva campos del body y no agrega cuit/pv si ya vienen en el payload", () => {
    const merged = mergeFacturarSaleRequestBody({
      tipo: 6,
      docTipo: 80,
      docNro: 30123456789,
      condicionIvaReceptor: 1,
      concepto: 1,
      cuitEmisor: "20123456789",
      puntoVenta: 5,
    })

    expect(merged.cuitEmisor).toBe("20123456789")
    expect(merged.puntoVenta).toBe(5)
    expect(merged.docTipo).toBe(80)
  })
})
