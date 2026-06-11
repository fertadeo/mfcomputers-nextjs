import { describe, expect, it } from "vitest"
import { buildArcaInvoicePdfInputFromPreviewLines } from "@/lib/build-arca-invoice-pdf-input"

describe("buildArcaInvoicePdfInputFromPreviewLines", () => {
  it("arma borrador con receptor, ítems y tipo NC", () => {
    const preview = buildArcaInvoicePdfInputFromPreviewLines({
      facturarPayload: {
        tipo: 6,
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        concepto: 1,
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Producto test",
          quantity: 2,
          unitPrice: 1000,
          subtotal: 2000,
          ivaRate: 21,
        },
      ],
      receptorRazonSocial: "MATERIALES BUTALO S. R. L.",
      totalAmount: 2000,
      tipoComprobante: 8,
      previewAviso: "Anula comprobante A 00005-00000001",
    })

    expect(preview.comprobante.tipo).toBe(8)
    expect(preview.comprobante.numero).toBe(0)
    expect(preview.comprobanteIncompleto).toBe(true)
    expect(preview.receptor.razonSocial).toContain("BUTALO")
    expect(preview.items).toHaveLength(1)
    expect(preview.cae).toBe("")
  })
})
