import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import { clienteMatchesQuery } from "@/lib/cliente-search"

function cliente(partial: Partial<Cliente>): Cliente {
  return {
    id: 1,
    code: "MAY001",
    client_type: "mayorista",
    sales_channel: "manual",
    name: "Ministerio de Educación",
    email: "contacto@educacion.gob.ar",
    phone: "0358-467-1200",
    address: "Av. Colón 1200",
    city: "Córdoba",
    country: "Argentina",
    is_active: 1,
    created_at: "",
    updated_at: "",
    cuil_cuit: "30-71234567-8",
    ...partial,
  }
}

describe("clienteMatchesQuery", () => {
  const cordoba = cliente({})
  const rioCuarto = cliente({
    id: 2,
    code: "MAY002",
    address: "Av. España 450",
    city: "Río Cuarto",
    phone: "0358-464-8899",
    cuil_cuit: "30-70999888-1",
  })

  it("distingue dos clientes con el mismo nombre por la dirección", () => {
    expect(clienteMatchesQuery(cordoba, "Av. Colón 1200")).toBe(true)
    expect(clienteMatchesQuery(rioCuarto, "Av. Colón 1200")).toBe(false)
  })

  it("encuentra por teléfono aunque se escriba sin guiones", () => {
    expect(clienteMatchesQuery(cordoba, "03584671200")).toBe(true)
    expect(clienteMatchesQuery(rioCuarto, "03584671200")).toBe(false)
  })

  it("encuentra por CUIT con o sin guiones", () => {
    expect(clienteMatchesQuery(cordoba, "30-71234567-8")).toBe(true)
    expect(clienteMatchesQuery(cordoba, "30712345678")).toBe(true)
    expect(clienteMatchesQuery(rioCuarto, "30712345678")).toBe(false)
  })

  it("sigue encontrando por nombre, código, email y ciudad", () => {
    expect(clienteMatchesQuery(cordoba, "ministerio")).toBe(true)
    expect(clienteMatchesQuery(cordoba, "MAY001")).toBe(true)
    expect(clienteMatchesQuery(cordoba, "educacion.gob")).toBe(true)
    expect(clienteMatchesQuery(cordoba, "córdoba")).toBe(true)
  })
})
