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
