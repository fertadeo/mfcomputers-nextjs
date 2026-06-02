import type { Cliente } from "@/lib/api"
import {
  afipCondicionFromTaxCondition,
  normalizeTaxConditionFromApi,
  type ClientTaxCondition,
} from "@/lib/client-tax-condition"
import { CONDICIONES_IVA_RECEPTOR } from "@/lib/facturacion-comprobantes"

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
