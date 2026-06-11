import type { FacturarSaleRequest } from "@/lib/api"
import type { ArcaPadronResult } from "@/lib/arca-padron"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import { resolveTipoComprobanteFromCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { clienteCuitDigitos } from "@/lib/facturacion-form-from-cliente"

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
  clienteCuil?: string | null,
  clientePrimaryTaxId?: string | null
): string {
  if (form.docTipo === 99) return ""
  if (form.docTipo === 80 && form.docNro != null && form.docNro > 0) {
    return formatCuitInputDisplay(String(form.docNro))
  }
  const d = soloDigitosDoc(clienteCuil) || soloDigitosDoc(clientePrimaryTaxId)
  if (d.length === 11) return formatCuitInputDisplay(d)
  return ""
}

/** CUIT del cliente ERP para mostrar en confirmación (cuil_cuit o primary_tax_id). */
export function clienteCuitForDisplay(cliente?: { cuil_cuit?: string | null; primary_tax_id?: string } | null): string {
  return clienteCuitDigitos(cliente as Parameters<typeof clienteCuitDigitos>[0])
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

/** Aplica condición IVA y tipo de comprobante desde padrón ARCA (misma lógica que alta de clientes). */
export function applyPadronToFacturarForm(
  prev: FacturarSaleRequest,
  padron: ArcaPadronResult
): FacturarSaleRequest {
  const digits = soloDigitosDoc(padron.cuit)
  if (digits.length !== 11) return prev

  const condicion =
    padron.condicionIvaCodigo != null && padron.condicionIvaCodigo > 0
      ? padron.condicionIvaCodigo
      : (prev.condicionIvaReceptor ?? 5)

  return {
    ...prev,
    docTipo: 80,
    docNro: parseInt(digits, 10),
    condicionIvaReceptor: condicion,
    tipo: resolveTipoComprobanteFromCondicionIvaReceptor(condicion),
  }
}

export interface FacturacionVentaDestinatario {
  name: string
  cuitDigits: string
  cuitFormatted: string | null
  condicionLabel: string
}

export function buildVentaDestinatarioSnapshot(
  saleClientName: string | null | undefined,
  billableClientName: string | null | undefined,
  clienteCuil?: string | null,
  taxCondition?: string | null,
  clientePrimaryTaxId?: string | null
): FacturacionVentaDestinatario {
  const name = (saleClientName || billableClientName || "Consumidor final").trim()
  const cuitDigits = soloDigitosDoc(clienteCuil) || soloDigitosDoc(clientePrimaryTaxId)
  return {
    name,
    cuitDigits,
    cuitFormatted: cuitDigits.length === 11 ? formatCuitInputDisplay(cuitDigits) : null,
    condicionLabel: formatTaxConditionLabel(taxCondition, "Sin datos fiscales en ERP"),
  }
}

export function isFacturacionDestinatarioChanged(
  venta: FacturacionVentaDestinatario,
  opts: {
    esConsumidorFinal: boolean
    receptorCuitDigits: string
    padronDisplayName?: string | null
  }
): boolean {
  if (opts.esConsumidorFinal) {
    return venta.cuitDigits.length === 11 || venta.name.toLowerCase() !== "consumidor final"
  }
  if (opts.receptorCuitDigits.length === 11 && opts.receptorCuitDigits !== venta.cuitDigits) {
    return true
  }
  if (opts.padronDisplayName) {
    return opts.padronDisplayName.trim().toUpperCase() !== venta.name.trim().toUpperCase()
  }
  return false
}

export function requiresPadronForReceptorCuit(
  ventaCuitDigits: string,
  receptorCuitDigits: string,
  esConsumidorFinal: boolean
): boolean {
  if (esConsumidorFinal) return false
  return receptorCuitDigits.length === 11 && receptorCuitDigits !== ventaCuitDigits
}
