import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
  tipoComprobanteRequiresZeroItemIva,
  validateFacturacionItemIva,
} from "@/lib/facturacion-cliente-fiscal"

function cliente(partial: Partial<Cliente> & Pick<Cliente, "id" | "name" | "code">): Cliente {
  return {
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    is_active: true,
    ...partial,
  }
}

describe("facturacion-cliente-fiscal — IVA por ítem", () => {
  it("solo Factura C exige ítems sin alícuota gravada", () => {
    expect(tipoComprobanteRequiresZeroItemIva(6)).toBe(false)
    expect(tipoComprobanteRequiresZeroItemIva(8)).toBe(false)
    expect(tipoComprobanteRequiresZeroItemIva(11)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(13)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(1)).toBe(false)
  })

  it("consumidor final (Factura B) permite IVA; monotributo (Factura C) no", () => {
    expect(clienteRequiresZeroItemIva(null)).toBe(false)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 1, name: "CF", code: "C1", tax_condition: "consumidor_final" })
      )
    ).toBe(false)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 2, name: "Mono", code: "M1", tax_condition: "monotributo" })
      )
    ).toBe(true)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 3, name: "RI", code: "R1", tax_condition: "responsable_inscripto" })
      )
    ).toBe(false)
  })

  it("effectiveSaleItemIvaRate solo fuerza 0% en Factura C", () => {
    expect(effectiveSaleItemIvaRate(21, null)).toBe(21)
    expect(
      effectiveSaleItemIvaRate(
        21,
        cliente({ id: 1, name: "CF", code: "C1", tax_condition: "consumidor_final" })
      )
    ).toBe(21)
    expect(
      effectiveSaleItemIvaRate(
        21,
        cliente({ id: 2, name: "Mono", code: "M1", tax_condition: "monotributo" })
      )
    ).toBe(0)
  })

  it("validateFacturacionItemIva bloquea ítems gravados solo en Factura C", () => {
    expect(validateFacturacionItemIva(6, [{ ivaRate: 21 }])).toBeNull()
    const err = validateFacturacionItemIva(11, [{ ivaRate: 21 }])
    expect(err).toMatch(/Factura C/)
    expect(validateFacturacionItemIva(11, [{ ivaRate: 0 }])).toBeNull()
    expect(validateFacturacionItemIva(1, [{ ivaRate: 21 }])).toBeNull()
  })
})
