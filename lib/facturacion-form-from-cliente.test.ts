import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import {
  applyClienteToFacturarForm,
  buildFacturarPayload,
  clienteCuitDigitos,
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
