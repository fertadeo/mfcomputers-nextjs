import { describe, expect, it } from "vitest"
import {
  buildFacturarFullPayloadPreview,
  mergeFacturarSaleRequestBody,
} from "@/lib/facturacion-request-preview"

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

  it("arma JSON completo con receptor, ítems e IVA", () => {
    const preview = buildFacturarFullPayloadPreview({
      saleId: 42,
      saleNumber: "SALE-001",
      clientId: 7,
      facturarPayload: {
        tipo: 1,
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        concepto: 1,
        cuitEmisor: "20339985945",
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Disco 1TB",
          quantity: 2,
          unitPrice: 100000,
          subtotal: 200000,
          ivaRate: 21,
          neto: 165289.26,
          iva: 34710.74,
        },
      ],
      receptor: {
        razonSocial: "MATERIALES BUTALO S. R. L.",
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        condicionIvaLabel: "IVA Responsable Inscripto",
        taxConditionEnErp: "responsable_inscripto",
      },
      totalAmount: 200000,
    })

    expect(preview.receptor.razonSocial).toBe("MATERIALES BUTALO S. R. L.")
    expect(preview.items).toHaveLength(1)
    expect(preview.items[0].quantity).toBe(2)
    expect(preview.items[0].iva_rate).toBe(21)
    expect(preview.totales.importe_total).toBe(200000)
    expect(preview.httpRequest.body.tipo).toBe(1)
  })
})
