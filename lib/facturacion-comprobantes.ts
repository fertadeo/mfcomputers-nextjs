/** Códigos WSFE habituales para selector en UI (no es lista exhaustiva AFIP). */
export const TIPOS_COMPROBANTE_AFIP = [
  { value: 1, label: "Factura A" },
  { value: 6, label: "Factura B" },
  { value: 11, label: "Factura C" },
  { value: 3, label: "Nota de crédito A" },
  { value: 8, label: "Nota de crédito B" },
  { value: 13, label: "Nota de crédito C" },
] as const

export const CONDICIONES_IVA_RECEPTOR = [
  { value: 1, label: "IVA Responsable Inscripto" },
  { value: 4, label: "IVA Sujeto Exento" },
  { value: 5, label: "Consumidor final" },
  { value: 6, label: "Responsable Monotributo" },
  { value: 9, label: "Cliente del Exterior" },
  { value: 10, label: "IVA Liberado" },
] as const

/** Tipos WSFE que exigen array `iva[]` en POST /api/facturas (A y B; no Factura C). */
const TIPOS_CON_IVA_DISCRIMINADO = new Set([1, 2, 3, 6, 7, 8])

export function facturadorTipoRequiereIva(tipo: number | undefined | null): boolean {
  if (tipo == null || !Number.isFinite(tipo)) return true
  return TIPOS_CON_IVA_DISCRIMINADO.has(tipo)
}

export function getTipoComprobanteLabel(tipo: number | undefined | null): string {
  if (tipo == null) return "—"
  const found = TIPOS_COMPROBANTE_AFIP.find((t) => t.value === tipo)
  return found ? `${found.label} (${tipo})` : `Comprobante tipo ${tipo}`
}

export function isTipoComprobanteConocido(tipo: number): boolean {
  return TIPOS_COMPROBANTE_AFIP.some((t) => t.value === tipo)
}

const TIPO_A_LETRA: Record<number, string> = {
  1: "A",
  2: "A",
  3: "A",
  4: "A",
  6: "B",
  7: "B",
  8: "B",
  9: "B",
  11: "C",
  12: "C",
  13: "C",
  15: "C",
}

const TIPO_A_CODIGO: Record<number, string> = {
  1: "001",
  6: "006",
  11: "011",
  3: "003",
  8: "008",
  13: "013",
}

export function getLetraComprobanteAfip(tipo: number): string {
  return TIPO_A_LETRA[tipo] ?? "X"
}

export function getCodigoComprobanteAfip(tipo: number): string {
  return TIPO_A_CODIGO[tipo] ?? String(tipo).padStart(3, "0")
}

export function formatPuntoVentaAfip(pv: number | null | undefined): string {
  return String(pv ?? 0).padStart(5, "0")
}

export function formatNumeroComprobanteAfip(nro: number | null | undefined): string {
  return String(nro ?? 0).padStart(8, "0")
}

export function formatCuitAfip(cuit: string | number | null | undefined): string {
  const d = String(cuit ?? "").replace(/\D/g, "")
  if (d.length !== 11) return String(cuit ?? "—")
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

/** Tipo WSFE de nota de crédito asociado a la factura emitida (misma letra). */
const FACTURA_A_NOTA_CREDITO: Record<number, number> = {
  1: 3,
  6: 8,
  11: 13,
  2: 2,
  7: 7,
  12: 12,
}

export function getNotaCreditoTipoForFactura(tipoFactura: number): number | null {
  return FACTURA_A_NOTA_CREDITO[tipoFactura] ?? null
}

export function formatComprobanteAfipReferencia(
  tipo: number,
  puntoVenta: number | null | undefined,
  numero: number | null | undefined
): string {
  const letra = getLetraComprobanteAfip(tipo)
  return `${letra} ${formatPuntoVentaAfip(puntoVenta)}-${formatNumeroComprobanteAfip(numero)}`
}

/** Solo facturas (no notas de crédito) para badges en listados. */
const FACTURA_TIPOS = [1, 6, 11] as const

const NOTA_CREDITO_TIPOS = [3, 8, 13] as const

export function isFacturaTipoAfip(tipo: number): boolean {
  return (FACTURA_TIPOS as readonly number[]).includes(tipo)
}

export function isNotaCreditoTipoAfip(tipo: number): boolean {
  return (NOTA_CREDITO_TIPOS as readonly number[]).includes(tipo)
}

/** Título en cabecera ARCA (columna derecha del comprobante). */
export function getComprobanteArcaTitulo(tipo: number): string {
  const letra = getLetraComprobanteAfip(tipo)
  if (isNotaCreditoTipoAfip(tipo)) {
    return `NOTA DE CRÉDITO ${letra}`
  }
  if (isFacturaTipoAfip(tipo)) {
    return `FACTURA ${letra}`
  }
  return "FACTURA"
}

export interface TipoComprobanteBadgeStyle {
  shortLabel: string
  className: string
}

const TIPO_BADGE_STYLES: Record<number, TipoComprobanteBadgeStyle> = {
  1: {
    shortLabel: "Factura A",
    className:
      "border-blue-500/40 bg-blue-500/15 text-blue-800 dark:text-blue-200 font-semibold",
  },
  6: {
    shortLabel: "Factura B",
    className:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold",
  },
  11: {
    shortLabel: "Factura C",
    className:
      "border-violet-500/40 bg-violet-500/15 text-violet-800 dark:text-violet-200 font-semibold",
  },
  3: {
    shortLabel: "NC A",
    className:
      "border-blue-400/30 bg-blue-400/10 text-blue-700 dark:text-blue-300 font-medium",
  },
  8: {
    shortLabel: "NC B",
    className:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 font-medium",
  },
  13: {
    shortLabel: "NC C",
    className:
      "border-violet-400/30 bg-violet-400/10 text-violet-700 dark:text-violet-300 font-medium",
  },
}

export function getTipoComprobanteBadgeStyle(
  tipo: number | null | undefined
): TipoComprobanteBadgeStyle {
  if (tipo == null || !Number.isFinite(tipo)) {
    return {
      shortLabel: "Sin tipo",
      className: "border-border bg-muted text-muted-foreground",
    }
  }
  return (
    TIPO_BADGE_STYLES[tipo] ?? {
      shortLabel: getTipoComprobanteLabel(tipo),
      className: "border-border bg-muted text-muted-foreground font-medium",
    }
  )
}
