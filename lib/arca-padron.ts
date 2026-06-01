/** Respuesta normalizada de GET /api/clients|suppliers/padron/{cuit} */
export interface ArcaPadronResult {
  cuit: string
  name?: string
  razonSocial?: string
  personeriaSugerida?: "persona_fisica" | "persona_juridica" | "consumidor_final"
  condicionIvaSugerida?: string
  condicionIvaLabel?: string
  padronParcial?: boolean
  advertencias?: string[]
}

export type ArcaPadronEntity = "client" | "supplier"

export const ARCA_PADRON_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CUIT: "El CUIT debe tener exactamente 11 dígitos.",
  CUIT_EMISOR_REQUERIDO:
    "Falta el CUIT emisor. Configuralo en Facturación o en variables del servidor.",
  QUOTA_FEATURE_DISABLED: "Tu plan de MultiCUIT no incluye consulta de padrón ARCA.",
  PADRON_SIN_DATOS: "No se encontraron datos en ARCA para ese CUIT.",
  PADRON_MULTI_SCOPE_FAILED:
    "El certificado no está autorizado para padrón A13/constancia. Revisá MultiCUIT.",
  FACTURADOR_NOT_CONFIGURED: "El facturador no está configurado en el servidor (URL o API key).",
}

export function normalizeCuitDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function formatCuitDisplay(value: string): string {
  const d = normalizeCuitDigits(value)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

export function isValidCuitDigits(value: string): boolean {
  return normalizeCuitDigits(value).length === 11
}

export function normalizePersoneriaSugerida(
  raw?: string | null
): ArcaPadronResult["personeriaSugerida"] | undefined {
  if (!raw?.trim()) return undefined
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_")
  if (s.includes("juridica") || s === "persona_juridica") return "persona_juridica"
  if (s.includes("fisica") || s === "persona_fisica") return "persona_fisica"
  if (s.includes("consumidor") || s === "consumidor_final") return "consumidor_final"
  return undefined
}

export function normalizeArcaPadronPayload(raw: unknown): ArcaPadronResult {
  const o =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {}
  const inner =
    o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o

  const cuit = String(inner.cuit ?? inner.Cuit ?? "").replace(/\D/g, "").slice(0, 11)
  const name = typeof inner.name === "string" ? inner.name : undefined
  const razonSocial =
    typeof inner.razonSocial === "string"
      ? inner.razonSocial
      : typeof inner.razon_social === "string"
        ? inner.razon_social
        : undefined

  const personeriaRaw =
    (inner.personeriaSugerida as string | undefined) ??
    (inner.personeria_sugerida as string | undefined)

  const condicionIvaSugerida =
    typeof inner.condicionIvaSugerida === "string"
      ? inner.condicionIvaSugerida
      : typeof inner.condicion_iva_sugerida === "string"
        ? inner.condicion_iva_sugerida
        : undefined

  const condicionIvaLabel =
    typeof inner.condicionIvaLabel === "string"
      ? inner.condicionIvaLabel
      : typeof inner.condicion_iva_label === "string"
        ? inner.condicion_iva_label
        : typeof inner.condicionIvaSugeridaLabel === "string"
          ? inner.condicionIvaSugeridaLabel
          : undefined

  const advertencias = Array.isArray(inner.advertencias)
    ? inner.advertencias.filter((a): a is string => typeof a === "string")
    : Array.isArray(inner.warnings)
      ? inner.warnings.filter((a): a is string => typeof a === "string")
      : undefined

  return {
    cuit,
    name,
    razonSocial,
    personeriaSugerida: normalizePersoneriaSugerida(personeriaRaw),
    condicionIvaSugerida,
    condicionIvaLabel,
    padronParcial: Boolean(inner.padronParcial ?? inner.padron_parcial),
    advertencias,
  }
}

export function getArcaPadronDisplayName(data: ArcaPadronResult): string {
  return (data.razonSocial || data.name || "").trim()
}

export function getArcaPadronIvaHint(data: ArcaPadronResult): string | null {
  const label = data.condicionIvaLabel?.trim()
  const code = data.condicionIvaSugerida?.trim()
  if (label && code && label !== code) return `${label} (${code})`
  return label || code || null
}

export function formatArcaPadronError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>
    const code = typeof o.code === "string" ? o.code : undefined
    if (code && ARCA_PADRON_ERROR_MESSAGES[code]) {
      return ARCA_PADRON_ERROR_MESSAGES[code]
    }
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim()
    if (typeof o.error === "string" && o.error.trim()) return o.error.trim()
  }
  if (status === 404) return ARCA_PADRON_ERROR_MESSAGES.PADRON_SIN_DATOS
  if (status === 403) return ARCA_PADRON_ERROR_MESSAGES.QUOTA_FEATURE_DISABLED
  if (status === 502) return ARCA_PADRON_ERROR_MESSAGES.PADRON_MULTI_SCOPE_FAILED
  if (status === 503) return ARCA_PADRON_ERROR_MESSAGES.FACTURADOR_NOT_CONFIGURED
  if (status === 400) return ARCA_PADRON_ERROR_MESSAGES.INVALID_CUIT
  return `No se pudo consultar el padrón ARCA (error ${status}).`
}
