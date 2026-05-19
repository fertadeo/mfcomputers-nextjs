/** Formato numérico y estilos compartidos plantilla ARCA (AFIP). */
export const ARCA_TABLE_HEADER_RGB: [number, number, number] = [230, 230, 230]

/** Normaliza valores de API (string | null) a número finito. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".")
    if (!trimmed) return fallback
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/** Formato ARCA: decimales con coma, sin separador de miles (ej. 55000,00). */
export function moneyAr(n: number | string | null | undefined): string {
  const [intPart, dec = "00"] = toNumber(n).toFixed(2).split(".")
  return `${intPart},${dec}`
}

export function moneyArWithSymbol(n: number | string | null | undefined): string {
  return `$ ${moneyAr(n)}`
}

export function fmtDateAr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function formatDocReceptor(docTipo: number | string, docNro: number | string): string {
  const tipo = toNumber(docTipo, 99)
  const nro = toNumber(docNro, 0)
  if (nro === 0 || tipo === 99) return "-"
  return String(nro)
}
