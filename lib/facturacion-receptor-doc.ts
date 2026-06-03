import type { FacturarSaleRequest } from "@/lib/api"
import { resolveTipoComprobanteFromCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"

export function soloDigitosDoc(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

/** Formato visual XX-XXXXXXXX-X (hasta 11 dígitos). */
export function formatCuitInputDisplay(value: string): string {
  const d = soloDigitosDoc(value).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

export function receptorCuitInputFromForm(
  form: FacturarSaleRequest,
  clienteCuil?: string | null
): string {
  if (form.docTipo === 99) return ""
  if (form.docTipo === 80 && form.docNro != null && form.docNro > 0) {
    return formatCuitInputDisplay(String(form.docNro))
  }
  const d = soloDigitosDoc(clienteCuil)
  if (d.length === 11) return formatCuitInputDisplay(d)
  return ""
}

export function isReceptorCuitInputInvalid(rawInput: string): boolean {
  const d = soloDigitosDoc(rawInput)
  return d.length > 0 && d.length !== 11
}

export interface ClienteFiscalSnapshot {
  condicionIvaReceptor: number
  tipoComprobante: number
}

/**
 * Actualiza docTipo/docNro (y condición CF si corresponde) según el CUIT ingresado en confirmación.
 * Vacío → consumidor final (docTipo 99, docNro 0, condición IVA 5).
 */
export function applyReceptorCuitToFacturarForm(
  prev: FacturarSaleRequest,
  rawInput: string,
  fiscalFromCliente?: ClienteFiscalSnapshot | null
): FacturarSaleRequest {
  const digits = soloDigitosDoc(rawInput)

  if (digits.length === 0) {
    return {
      ...prev,
      docTipo: 99,
      docNro: 0,
      condicionIvaReceptor: 5,
      tipo: resolveTipoComprobanteFromCondicionIvaReceptor(5),
    }
  }

  if (digits.length !== 11) {
    return prev
  }

  const next: FacturarSaleRequest = {
    ...prev,
    docTipo: 80,
    docNro: parseInt(digits, 10),
  }

  if (
    fiscalFromCliente &&
    prev.condicionIvaReceptor === 5 &&
    fiscalFromCliente.condicionIvaReceptor !== 5
  ) {
    next.condicionIvaReceptor = fiscalFromCliente.condicionIvaReceptor
    next.tipo = fiscalFromCliente.tipoComprobante
  }

  return next
}
