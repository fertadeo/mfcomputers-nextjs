/** Formato numérico y estilos compartidos plantilla ARCA (AFIP). */
export const ARCA_TABLE_HEADER_RGB: [number, number, number] = [230, 230, 230]

/** Formato ARCA: decimales con coma, sin separador de miles (ej. 55000,00). */
export function moneyAr(n: number): string {
  const [intPart, dec = "00"] = n.toFixed(2).split(".")
  return `${intPart},${dec}`
}

export function moneyArWithSymbol(n: number): string {
  return `$ ${moneyAr(n)}`
}

export function fmtDateAr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function formatDocReceptor(docTipo: number, docNro: number): string {
  if (docNro === 0 || docTipo === 99) return "-"
  return String(docNro)
}
