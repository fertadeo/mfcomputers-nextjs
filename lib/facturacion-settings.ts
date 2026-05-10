/**
 * Preferencias de facturación ARCA guardadas en el navegador (localStorage).
 * La API key del facturador NO debe confiar solo del cliente en producción: ver copy en Configuración.
 */

export const FACTURACION_STORAGE_KEYS = {
  CUIT_EMISOR: "mf_facturacion_cuit_emisor",
  PUNTO_VENTA: "mf_facturacion_punto_venta",
  FACTURADOR_API_KEY: "mf_facturacion_facturador_api_key",
} as const

function soloDigitos(s: string): string {
  return s.replace(/\D/g, "")
}

/** CUIT sin guiones para enviar al backend (11 dígitos) o null si está vacío / inválido */
export function normalizeCuitEmisor(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const d = soloDigitos(raw.trim())
  if (d.length !== 11) return null
  return d
}

export function getStoredFacturacionCuitEmisor(): string | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(FACTURACION_STORAGE_KEYS.CUIT_EMISOR)
  return normalizeCuitEmisor(raw ?? "")
}

export function getStoredFacturacionPuntoVenta(): number | undefined {
  if (typeof window === "undefined") return undefined
  const raw = localStorage.getItem(FACTURACION_STORAGE_KEYS.PUNTO_VENTA)?.trim()
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1 || n > 99999) return undefined
  return n
}

/**
 * Clave del API facturador guardada en el navegador.
 * Solo tiene utilidad si MF API acepta cabecera `x-facturador-api-key` (u otro contrato acordado).
 */
export function getStoredFacturadorApiKey(): string | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem(FACTURACION_STORAGE_KEYS.FACTURADOR_API_KEY)?.trim()
  return v || null
}
