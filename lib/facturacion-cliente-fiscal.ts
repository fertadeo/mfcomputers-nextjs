import type { Cliente } from "@/lib/api"
import {
  afipCondicionFromTaxCondition,
  normalizeTaxConditionFromApi,
  type ClientTaxCondition,
} from "@/lib/client-tax-condition"
import { CONDICIONES_IVA_RECEPTOR } from "@/lib/facturacion-comprobantes"
import { normalizeSaleIvaRate, type SaleIvaRate } from "@/lib/sale-iva"

export type EmisorCondicionIva = "responsable_inscripto" | "monotributo"

/** Condición IVA del emisor (MF). Por defecto RI; monotributo emite solo Factura C. */
export function getEmisorCondicionIva(): EmisorCondicionIva {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_FACTURADOR_EMISOR_CONDICION_IVA?.trim().toLowerCase()
      : undefined
  return raw === "monotributo" ? "monotributo" : "responsable_inscripto"
}

export function condicionIvaReceptorFromCliente(cliente: Cliente | null): number {
  if (!cliente) return 5

  const stored = (cliente as Cliente & { condicion_iva_receptor?: number }).condicion_iva_receptor
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored
  }

  const tc = normalizeTaxConditionFromApi(cliente.tax_condition)
  if (tc) return afipCondicionFromTaxCondition(tc)

  if (cliente.personeria === "persona_juridica") return 1
  if (cliente.personeria === "persona_fisica") return 5

  return 5
}

/**
 * Tipo WSFE según condición IVA del receptor y del emisor.
 * RI receptor → Factura A (1); monotributo receptor → Factura C (11);
 * exento / consumidor final → Factura B (6). Emisor monotributo → siempre C (11).
 */
export function resolveTipoComprobanteFromCondicionIvaReceptor(
  condicionIvaReceptor: number,
  emisorCondicion: EmisorCondicionIva = getEmisorCondicionIva()
): number {
  if (emisorCondicion === "monotributo") return 11

  switch (condicionIvaReceptor) {
    case 1:
      return 1
    case 6:
      return 11
    case 4:
    case 5:
    case 9:
    case 10:
      return 6
    default:
      return 6
  }
}

export function resolveFacturacionDesdeCliente(cliente: Cliente | null): {
  condicionIvaReceptor: number
  tipoComprobante: number
  taxCondition?: ClientTaxCondition
} {
  const taxCondition = normalizeTaxConditionFromApi(cliente?.tax_condition)
  const condicionIvaReceptor = condicionIvaReceptorFromCliente(cliente)
  const tipoComprobante = resolveTipoComprobanteFromCondicionIvaReceptor(condicionIvaReceptor)
  return { condicionIvaReceptor, tipoComprobante, taxCondition }
}

export function labelCondicionIvaReceptor(codigo: number): string {
  const found = CONDICIONES_IVA_RECEPTOR.find((c) => c.value === codigo)
  return found?.label ?? `Condición ${codigo}`
}

/** Factura B/C (y NC asociadas): AFIP rechaza IVA discriminado por ítem en el payload. */
export function tipoComprobanteRequiresZeroItemIva(tipo: number): boolean {
  return tipo === 6 || tipo === 11 || tipo === 8 || tipo === 13
}

/**
 * Consumidor final, monotributo y demás receptores de Factura B/C no admiten alícuota gravada en ítems.
 * Sin cliente se asume consumidor final → Factura B.
 */
export function clienteRequiresZeroItemIva(cliente: Cliente | null): boolean {
  const tipo = resolveFacturacionDesdeCliente(cliente).tipoComprobante
  return tipoComprobanteRequiresZeroItemIva(tipo)
}

export function effectiveSaleItemIvaRate(
  ivaRate: number | null | undefined,
  cliente: Cliente | null
): SaleIvaRate {
  if (clienteRequiresZeroItemIva(cliente)) return 0
  return normalizeSaleIvaRate(ivaRate)
}

export function saleLinesHaveGravadoIva(
  lines: Array<{ iva_rate?: number | null; ivaRate?: number | null }>
): boolean {
  return lines.some((line) => normalizeSaleIvaRate(line.iva_rate ?? line.ivaRate) > 0)
}

export function validateFacturacionItemIva(
  tipoComprobante: number,
  lines: Array<{ iva_rate?: number | null; ivaRate?: number | null }>
): string | null {
  if (!tipoComprobanteRequiresZeroItemIva(tipoComprobante)) return null
  if (!saleLinesHaveGravadoIva(lines)) return null
  return "Esta venta tiene ítems con IVA gravado (21% o 10,5%), pero el comprobante es Factura B o C. Editá la venta y poné todos los ítems en 0% (exento) antes de facturar; ARCA rechazará el comprobante si se envía con IVA discriminado."
}
