import { describe, expect, it } from "vitest"
import { formatDocReceptor } from "@/lib/arca-invoice-format"
import { resolveReceptorDocForInvoicePdf } from "@/lib/facturacion-receptor-doc"

describe("formatDocReceptor", () => {
  it("formatea CUIT con guiones", () => {
    expect(formatDocReceptor(80, 30709212083)).toBe("30-70921208-3")
  })

  it("muestra guión solo sin número", () => {
    expect(formatDocReceptor(99, 0)).toBe("-")
  })

  it("muestra CUIT aunque docTipo sea 99 (payload incompleto)", () => {
    expect(formatDocReceptor(99, 30709212083)).toBe("30-70921208-3")
  })
})

describe("resolveReceptorDocForInvoicePdf", () => {
  it("prioriza docTipo 80 del payload", () => {
    expect(
      resolveReceptorDocForInvoicePdf(
        { docTipo: 80, docNro: 20339985945 },
        { cuil_cuit: "30709212083" }
      )
    ).toEqual({ docTipo: 80, docNro: 20339985945 })
  })

  it("toma CUIT del cliente si el payload es consumidor final", () => {
    expect(
      resolveReceptorDocForInvoicePdf(
        { docTipo: 99, docNro: 0 },
        { primary_tax_id: "30-70921208-3" }
      )
    ).toEqual({ docTipo: 80, docNro: 30709212083 })
  })
})
