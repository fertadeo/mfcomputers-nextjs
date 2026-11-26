import type { Cliente } from "@/lib/api"

/** Texto único de los buscadores de clientes ya cargados en el sistema. */
export const CLIENTE_SEARCH_PLACEHOLDER =
  "Buscar por nombre, CUIT, teléfono, dirección o código…"

function digitsOf(value: string): string {
  return value.replace(/\D/g, "")
}

function includesText(value: string | null | undefined, query: string): boolean {
  return (value ?? "").toLowerCase().includes(query)
}

/**
 * Misma regla que el API: nombre, código, email, teléfono, dirección, ciudad y CUIT.
 * Un texto con letras (una calle, por ejemplo) no se compara contra el teléfono solo por sus números.
 */
export function clienteMatchesQuery(cliente: Cliente, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  const textHit =
    includesText(cliente.name, query) ||
    includesText(cliente.code, query) ||
    includesText(cliente.email, query) ||
    includesText(cliente.phone, query) ||
    includesText(cliente.address, query) ||
    includesText(cliente.city, query) ||
    includesText(cliente.cuil_cuit, query) ||
    includesText(cliente.primary_tax_id, query)

  if (textHit) return true

  if (/[a-záéíóúüñ]/i.test(query)) return false
  const digits = digitsOf(query)
  if (digits.length < 4) return false

  const phoneDigits = digitsOf(cliente.phone ?? "")
  const cuitDigits = digitsOf(cliente.cuil_cuit || cliente.primary_tax_id || "")
  return phoneDigits.includes(digits) || cuitDigits.includes(digits)
}
