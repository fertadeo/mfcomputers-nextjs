/**
 * Mensajes de error de facturación ARCA (MultiCUIT vía MF API).
 * Alineado con integración ERP: WSFE, idempotencia, CAE y persistencia.
 */

export type FacturacionErrorSeverity = "error" | "warning"

export interface FacturacionErrorInfo {
  code: string
  title: string
  message: string
  actionHint?: string
  severity: FacturacionErrorSeverity
  canRetry: boolean
  /** Mostrar campo force / reintento forzado en UI */
  suggestForceRetry?: boolean
  /** No reemitir sin reconciliar (PERSIST_DB_ERROR, posible duplicado ARCA) */
  blockBlindReemit?: boolean
  showRequestId?: boolean
}

export interface ResolveFacturacionErrorInput {
  code?: string | null
  httpStatus?: number
  rawMessage?: string | null
  requestId?: string | null
  sugerencias?: string[] | null
}

export interface ExtractedFacturacionError {
  code?: string
  message?: string
  requestId?: string
  sugerencias?: string[]
  httpStatus?: number
}

/** Convierte vencimiento CAE AFIP YYYYMMDD → YYYY-MM-DD */
export function vencimientoCaeAfipAIso(yyyymmdd: string | number | null | undefined): string | null {
  const s = String(yyyymmdd ?? "").replace(/\D/g, "")
  if (s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function readNestedCode(obj: Record<string, unknown>): string | undefined {
  const err = obj.error
  if (isRecord(err) && err.code != null) return String(err.code).trim()
  return undefined
}

function readNestedMessage(obj: Record<string, unknown>): string | undefined {
  const err = obj.error
  if (isRecord(err) && typeof err.message === "string") return err.message
  if (typeof obj.message === "string") return obj.message
  return undefined
}

function readNestedRequestId(obj: Record<string, unknown>): string | undefined {
  if (typeof obj.requestId === "string") return obj.requestId
  const err = obj.error
  if (isRecord(err) && typeof err.requestId === "string") return err.requestId
  return undefined
}

function readSugerencias(obj: Record<string, unknown>): string[] | undefined {
  const err = obj.error
  if (!isRecord(err)) return undefined
  const details = err.details
  if (!isRecord(details)) return undefined
  const s = details.sugerencias
  if (!Array.isArray(s)) return undefined
  return s.filter((x): x is string => typeof x === "string")
}

/**
 * Extrae código, mensaje y requestId desde respuestas MF API o MultiCUIT anidadas.
 */
export function extractFacturacionErrorFromPayload(
  payload: unknown,
  httpStatus?: number
): ExtractedFacturacionError {
  const out: ExtractedFacturacionError = { httpStatus }

  if (!isRecord(payload)) return out

  // MultiCUIT directo: { ok: false, error: { code, message, details } }
  const multicuitCode = readNestedCode(payload)
  if (multicuitCode) {
    out.code = multicuitCode
    out.message = readNestedMessage(payload)
    out.requestId = readNestedRequestId(payload)
    out.sugerencias = readSugerencias(payload)
    return out
  }

  // MF API: { success: false, data: { code, ... }, error, message }
  if (typeof payload.error === "string" && !out.message) out.message = payload.error
  if (typeof payload.message === "string") out.message = payload.message

  const data = payload.data
  if (isRecord(data)) {
    if (data.code != null) out.code = String(data.code).trim()
    if (data.retryAfter != null && out.httpStatus == null) out.httpStatus = httpStatus

    const sale = data.sale
    if (isRecord(sale)) {
      if (!out.code && sale.arca_error_code) out.code = String(sale.arca_error_code).trim()
      if (!out.message && typeof sale.arca_error_message === "string") {
        out.message = sale.arca_error_message
      }
    }

    const arca = data.arca
    if (isRecord(arca)) {
      const remote = arca.response
      if (isRecord(remote)) {
        const nested = extractFacturacionErrorFromPayload(remote, httpStatus)
        if (!out.code && nested.code) out.code = nested.code
        if (!out.message && nested.message) out.message = nested.message
        if (!out.requestId && nested.requestId) out.requestId = nested.requestId
        if (!out.sugerencias?.length && nested.sugerencias?.length) out.sugerencias = nested.sugerencias
      }
    }
  }

  return out
}

const KNOWN_ERRORS: Record<string, Omit<FacturacionErrorInfo, "code">> = {
  VALIDATION_ERROR: {
    title: "Datos del comprobante inválidos",
    message:
      "AFIP rechazó el payload antes de emitir. Revisá tipo de comprobante, condición IVA, importes, documento del receptor y fechas de servicio.",
    actionHint: "Corregí los datos del formulario y volvé a intentar. No uses el mismo intento sin cambios.",
    severity: "error",
    canRetry: true,
  },
  IDEMPOTENCY_CONFLICT: {
    title: "Conflicto de idempotencia",
    message:
      "Ya existe un intento de emisión con la misma clave pero con datos distintos. El sistema no puede duplicar la operación automáticamente.",
    actionHint:
      "Revisá si la venta ya fue facturada (ver comprobante). Si fue un error de red, contactá soporte con el ID de venta antes de forzar una nueva emisión.",
    severity: "error",
    canRetry: false,
    blockBlindReemit: true,
  },
  IDEMPOTENCY_REQUIRES_DB: {
    title: "Idempotencia no disponible",
    message: "El facturador no tiene base de datos configurada para registrar claves de idempotencia.",
    actionHint: "Es un problema de configuración del servidor MultiCUIT. Informá a sistemas.",
    severity: "error",
    canRetry: false,
    showRequestId: true,
  },
  WSFE_NO_CAE: {
    title: "AFIP no devolvió CAE",
    message:
      "La emisión en WSFE finalizó sin CAE. La venta no debe considerarse facturada ni autorizada ante AFIP.",
    actionHint:
      "Revisá punto de venta, tipo de comprobante, homologación vs producción y certificados del CUIT emisor. No reintentés con force hasta validar la causa.",
    severity: "error",
    canRetry: true,
    blockBlindReemit: true,
  },
  PERSIST_DB_ERROR: {
    title: "Error al guardar la factura emitida",
    message:
      "Es posible que AFIP haya autorizado el comprobante, pero falló el guardado en MultiCUIT. No asignes un nuevo número ni reemitas sin reconciliar.",
    actionHint:
      "Contactá a operaciones o soporte con el requestId. Consultá el detalle de la factura en MultiCUIT antes de volver a emitir.",
    severity: "warning",
    canRetry: false,
    blockBlindReemit: true,
    showRequestId: true,
  },
  AUTH_INVALID_KEY: {
    title: "Clave del facturador inválida",
    message: "La API key de MultiCUIT fue rechazada (401).",
    actionHint: "Revisá la clave en Configuración → Facturación ARCA o la variable FACTURADOR_API_KEY en el servidor.",
    severity: "error",
    canRetry: false,
  },
  AUTH_MISSING_KEY: {
    title: "Falta configurar el facturador",
    message: "No hay API key del facturador configurada en el servidor.",
    actionHint: "Configurá FACTURADOR_API_KEY en MF API o la clave en Configuración → Facturación ARCA.",
    severity: "error",
    canRetry: false,
  },
  FACTURADOR_UNAVAILABLE: {
    title: "Facturador no disponible",
    message: "No se pudo contactar al servicio de facturación ARCA.",
    actionHint: "Verificá conectividad y estado del backend MultiCUIT. Reintentá en unos minutos.",
    severity: "error",
    canRetry: true,
  },
  SALE_ALREADY_INVOICED: {
    title: "Venta ya facturada",
    message: "Esta venta ya tiene comprobante autorizado en ARCA.",
    actionHint: "Usá «Ver comprobante». Solo activá reintento forzado (force) si operaciones confirma que debés corregir.",
    severity: "warning",
    canRetry: false,
    suggestForceRetry: true,
  },
  SALE_NOT_FOUND: {
    title: "Venta no encontrada",
    message: "No se encontró la venta indicada para facturar.",
    severity: "error",
    canRetry: false,
  },
  SALE_INVALID_ITEMS: {
    title: "Ítems de venta inválidos",
    message: "La venta no tiene ítems válidos para armar el comprobante.",
    actionHint: "Revisá productos, cantidades e importes de la venta antes de facturar.",
    severity: "error",
    canRetry: true,
  },
  EMPTY_CAE: {
    title: "Respuesta sin CAE",
    message:
      "El servidor respondió éxito pero no devolvió un CAE válido. La venta no debe marcarse como facturada.",
    actionHint: "Revisá logs del backend y el estado en MultiCUIT antes de reintentar.",
    severity: "error",
    canRetry: true,
    blockBlindReemit: true,
  },
  NETWORK_ERROR: {
    title: "Error de conexión",
    message: "No se pudo comunicar con MF API. Comprobá tu conexión a internet.",
    actionHint:
      "Si la red se cortó durante la emisión, no generes un nuevo intento manual: el backend reutiliza la misma clave de idempotencia al reintentar la misma venta.",
    severity: "warning",
    canRetry: true,
  },
  RATE_LIMITED: {
    title: "Demasiados intentos",
    message: "El servidor limitó temporalmente las emisiones (HTTP 429).",
    actionHint: "Esperá el tiempo indicado antes de volver a intentar.",
    severity: "warning",
    canRetry: true,
  },
}

/** Códigos numéricos habituales de observaciones ARCA/WSFE */
const ARCA_NUMERIC_ERRORS: Record<string, Omit<FacturacionErrorInfo, "code">> = {
  "10003": {
    title: "Comprobante posiblemente duplicado",
    message: "AFIP indica que el comprobante podría estar duplicado (código 10003).",
    actionHint:
      "No reemitas con un número nuevo. Reconciliá con MultiCUIT o AFIP si hubo timeout en un intento anterior.",
    severity: "warning",
    canRetry: false,
    blockBlindReemit: true,
  },
  "10016": {
    title: "Punto de venta no habilitado",
    message: "El punto de venta no está habilitado para este tipo de comprobante (código 10016).",
    actionHint: "Verificá el PV en Configuración y en AFIP / certificados del CUIT emisor.",
    severity: "error",
    canRetry: true,
  },
  "10054": {
    title: "Fecha del comprobante inválida",
    message: "La fecha de emisión está fuera del rango permitido por AFIP (código 10054).",
    actionHint: "Revisá la fecha del comprobante y el reloj del servidor.",
    severity: "error",
    canRetry: true,
  },
  "10056": {
    title: "Documento del receptor inválido",
    message: "El tipo o número de documento del receptor no es válido para AFIP (código 10056).",
    actionHint: "Revisá docTipo, docNro y CUIT/CUIL del cliente en el ERP.",
    severity: "error",
    canRetry: true,
  },
  "10071": {
    title: "Condición IVA del receptor",
    message: "La condición frente al IVA del receptor no coincide con lo esperado por AFIP (código 10071).",
    actionHint: "Ajustá condicionIvaReceptor según el tipo de cliente.",
    severity: "error",
    canRetry: true,
  },
}

function isArcaNumericCode(code: string): boolean {
  return /^\d{4,6}$/.test(code)
}

export function resolveFacturacionError(input: ResolveFacturacionErrorInput): FacturacionErrorInfo {
  const code = (input.code?.trim() || "").toUpperCase() || undefined
  const numericCode = input.code?.trim() && isArcaNumericCode(input.code.trim()) ? input.code.trim() : undefined

  if (input.httpStatus === 429) {
    return { code: "RATE_LIMITED", ...KNOWN_ERRORS.RATE_LIMITED }
  }

  if (code && KNOWN_ERRORS[code]) {
    return { code, ...KNOWN_ERRORS[code] }
  }

  if (numericCode && ARCA_NUMERIC_ERRORS[numericCode]) {
    return { code: numericCode, ...ARCA_NUMERIC_ERRORS[numericCode] }
  }

  const sugerenciasText =
    input.sugerencias && input.sugerencias.length > 0
      ? ` Sugerencias: ${input.sugerencias.join(" ")}`
      : ""

  const raw = input.rawMessage?.trim()
  const fallbackMessage = raw
    ? `${raw}${sugerenciasText}`
    : code
      ? `Error de facturación (${code}).${sugerenciasText}`
      : `Error al facturar en ARCA.${sugerenciasText}`

  return {
    code: code || numericCode || "UNKNOWN",
    title: "No se pudo emitir el comprobante",
    message: fallbackMessage,
    actionHint:
      input.httpStatus === 502
        ? "Si el problema persiste, revisá certificados, entorno homologación/producción y contactá soporte."
        : "Revisá los datos del comprobante. Si el error continúa, guardá el mensaje y el requestId para soporte.",
    severity: "error",
    canRetry: input.httpStatus !== 409,
    showRequestId: Boolean(input.requestId),
  }
}

export function formatFacturacionErrorForUi(info: FacturacionErrorInfo, requestId?: string | null): string {
  const parts = [info.message]
  if (info.actionHint) parts.push(info.actionHint)
  if (info.showRequestId && requestId) parts.push(`Referencia: ${requestId}`)
  return parts.join(" ")
}

export interface FacturacionEmisionData {
  cae: string
  vencimientoCaeIso: string | null
  facturaId: string | null
  numero: number | null
  puntoVenta: number | null
  tipo: number | null
  qrUrl: string | null
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function pickNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

/** Extrae CAE, vencimiento y metadatos desde respuesta MF API (incluye payload MultiCUIT anidado). */
export function extractFacturacionEmisionFromResponse(payload: unknown): FacturacionEmisionData | null {
  if (!isRecord(payload)) return null

  const data = payload.data
  if (!isRecord(data)) return null

  const sale = isRecord(data.sale) ? data.sale : null
  const arca = isRecord(data.arca) ? data.arca : null
  const remote = arca && isRecord(arca.response) ? arca.response : null
  const remoteData = remote && isRecord(remote.data) ? remote.data : null

  const cae = pickString(arca?.cae, sale?.arca_cae, remoteData?.cae)
  if (!cae) return null

  const vtoRaw = pickString(
    arca?.vencimientoCae,
    arca?.cae_vto,
    sale?.arca_cae_vto,
    remoteData?.vencimientoCae,
    remoteData?.cae_vto
  )

  let vencimientoCaeIso: string | null = null
  if (vtoRaw) {
    vencimientoCaeIso =
      /^\d{8}$/.test(vtoRaw.replace(/\D/g, "")) && vtoRaw.replace(/\D/g, "").length === 8
        ? vencimientoCaeAfipAIso(vtoRaw)
        : vtoRaw.includes("-")
          ? vtoRaw.slice(0, 10)
          : vencimientoCaeAfipAIso(vtoRaw)
  }

  const persistencia = remote && isRecord(remote.persistencia) ? remote.persistencia : null

  return {
    cae,
    vencimientoCaeIso,
    facturaId: pickString(arca?.facturaId, sale?.arca_factura_id, persistencia?.facturaId),
    numero: pickNumber(remoteData?.numero),
    puntoVenta: pickNumber(remoteData?.puntoVenta, arca?.puntoVenta),
    tipo: pickNumber(remoteData?.tipo),
    qrUrl: pickString(remoteData?.qrUrl, arca?.qrUrl),
  }
}

export function isCaeValido(cae: string | null | undefined): boolean {
  return Boolean(cae && String(cae).trim().length > 0)
}

/** Mensaje corto para listados según código persistido en la venta */
export function resolveFacturacionErrorFromSale(
  arcaErrorCode?: string | null,
  arcaErrorMessage?: string | null
): FacturacionErrorInfo | null {
  if (!arcaErrorCode && !arcaErrorMessage) return null
  return resolveFacturacionError({
    code: arcaErrorCode,
    rawMessage: arcaErrorMessage,
  })
}
