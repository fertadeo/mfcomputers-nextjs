import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import {
  applyClienteToFacturarForm,
  buildFacturarFormForSale,
  buildFacturarPayload,
  clienteCuitDigitos,
  validateFacturarPayloadCoherence,
  validateFacturarReceptorFiscal,
} from "@/lib/facturacion-form-from-cliente"

function cliente(partial: Partial<Cliente> & Pick<Cliente, "id" | "name" | "code">): Cliente {
  return {
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina",
    is_active: 1,
    created_at: "",
    updated_at: "",
    client_type: "mayorista",
    sales_channel: "manual",
    ...partial,
  }
}

describe("facturacion-form-from-cliente", () => {
  it("lee CUIT desde primary_tax_id si falta cuil_cuit", () => {
    expect(
      clienteCuitDigitos(
        cliente({
          id: 1,
          name: "Ministerio",
          code: "M1",
          primary_tax_id: "30-12345678-9",
        })
      )
    ).toBe("30123456789")
  })

  it("aplica docTipo 80 y condición RI para cliente jurídico con CUIT", () => {
    const form = applyClienteToFacturarForm(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 },
      cliente({
        id: 1,
        name: "MINISTERIO TEST",
        code: "M1",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        primary_tax_id: "30123456789",
      })
    )
    expect(form.docTipo).toBe(80)
    expect(form.docNro).toBe(30123456789)
    expect(form.condicionIvaReceptor).toBe(1)
    expect(form.tipo).toBe(1)
  })

  it("buildFacturarPayload no deja CF si el form tenía docTipo 99 pero el cliente tiene CUIT", () => {
    const payload = buildFacturarPayload(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 },
      cliente({
        id: 1,
        name: "MINISTERIO TEST",
        code: "M1",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        cuil_cuit: "30123456789",
      })
    )
    expect(payload.docTipo).toBe(80)
    expect(payload.condicionIvaReceptor).toBe(1)
  })

  it("aplica Factura B a receptor monotributo cuando el emisor es RI", () => {
    const form = applyClienteToFacturarForm(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 11 },
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      })
    )
    expect(form.condicionIvaReceptor).toBe(6)
    expect(form.tipo).toBe(6)
    expect(form.docTipo).toBe(80)
  })

  it("usa tipo sugerido por la API (emisor RI → Factura B para monotributo)", () => {
    const form = buildFacturarFormForSale(
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      }),
      {
        totalAmount: 2,
        condicionIvaReceptor: 6,
        sugerencia: {
          tipo: 6,
          label: "Factura B",
          motivo: "Emisor RI frente a monotributo: corresponde Factura B.",
        },
      }
    )
    expect(form.tipo).toBe(6)
    expect(form.condicionIvaReceptor).toBe(6)
  })

  it("no deja Factura A con consumidor final si sugerencia API contradice al cliente ERP", () => {
    const form = buildFacturarFormForSale(
      cliente({
        id: 1,
        name: "MATERIALES BUTALO S. R. L.",
        code: "MIN033",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        primary_tax_id: "30709212083",
      }),
      {
        totalAmount: 1000,
        condicionIvaReceptor: 5,
        sugerencia: { tipo: 1, label: "Factura A" },
      }
    )
    expect(form.condicionIvaReceptor).toBe(1)
    expect(form.tipo).toBe(1)
    expect(form.docTipo).toBe(80)
    expect(form.docNro).toBe(30709212083)
  })

  it("validateFacturarPayloadCoherence rechaza Factura A sin CUIT", () => {
    const err = validateFacturarPayloadCoherence({
      tipo: 1,
      condicionIvaReceptor: 5,
      docTipo: 99,
      docNro: 0,
    })
    expect(err).toMatch(/no coincide/)
  })

  it("validateFacturarPayloadCoherence rechaza CUIT con condición consumidor final", () => {
    const err = validateFacturarPayloadCoherence({
      tipo: 6,
      condicionIvaReceptor: 5,
      docTipo: 80,
      docNro: 20355026656,
    })
    expect(err).toMatch(/docTipo 80/)
  })

  it("validateFacturarReceptorFiscal detecta CUIT en ERP con payload CF", () => {
    const err = validateFacturarReceptorFiscal(
      { client_id: 10, client_name: "MINISTERIO" },
      cliente({
        id: 10,
        name: "MINISTERIO",
        code: "M1",
        cuil_cuit: "30123456789",
        tax_condition: "responsable_inscripto",
        personeria: "persona_juridica",
      }),
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 }
    )
    expect(err).toMatch(/consumidor final/)
  })
})
