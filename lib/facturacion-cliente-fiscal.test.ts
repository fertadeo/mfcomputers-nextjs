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
  it("Factura B/C exigen ítems sin alícuota gravada", () => {
    expect(tipoComprobanteRequiresZeroItemIva(6)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(11)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(1)).toBe(false)
  })

  it("consumidor final y monotributo requieren IVA 0% en ítems", () => {
    expect(clienteRequiresZeroItemIva(null)).toBe(true)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 1, name: "CF", code: "C1", tax_condition: "consumidor_final" })
      )
    ).toBe(true)
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

  it("effectiveSaleItemIvaRate fuerza 0% cuando el cliente es B/C", () => {
    expect(effectiveSaleItemIvaRate(21, null)).toBe(0)
    expect(
      effectiveSaleItemIvaRate(
        21,
        cliente({ id: 1, name: "RI", code: "R1", tax_condition: "responsable_inscripto" })
      )
    ).toBe(21)
  })

  it("validateFacturacionItemIva detecta ítems gravados en Factura B", () => {
    const err = validateFacturacionItemIva(6, [{ ivaRate: 21 }])
    expect(err).toMatch(/ARCA rechazará/)
    expect(validateFacturacionItemIva(6, [{ ivaRate: 0 }])).toBeNull()
    expect(validateFacturacionItemIva(1, [{ ivaRate: 21 }])).toBeNull()
  })
})
