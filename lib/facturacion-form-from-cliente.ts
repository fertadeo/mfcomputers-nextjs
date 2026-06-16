import type { Cliente, FacturarSaleRequest, FacturarSugerenciaData } from "@/lib/api"
import { normalizeTaxConditionFromApi } from "@/lib/client-tax-condition"
import {
  resolveFacturacionDesdeCliente,
  resolveTipoComprobanteFromCondicionIvaReceptor,
  setEmisorRegimenFromApi,
} from "@/lib/facturacion-cliente-fiscal"
import {
  isComprobanteClaseB,
  normalizeCondicionIvaReceptorForWsfe,
} from "@/lib/facturacion-comprobantes"
import { buildDefaultFacturarFormRequest } from "@/lib/facturacion-settings"
import { soloDigitosDoc } from "@/lib/facturacion-receptor-doc"

/** Cliente con datos fiscales confiables en el ERP (no pisar con sugerencia API). */
export function clienteTieneDatosFiscalesErp(cliente?: Cliente | null): boolean {
  if (!cliente) return false
  if (clienteCuitDigitos(cliente).length === 11) return true
  if (normalizeTaxConditionFromApi(cliente.tax_condition)) return true
  if (cliente.personeria === "persona_juridica") return true
  if (cliente.condicion_iva_receptor != null && cliente.condicion_iva_receptor > 0) return true
  return false
}

/** docTipo 80 + condición 5: válido en Factura B (monotributo con CUIT); inválido en Factura A. */
export function validateReceptorDocumentoCondicion(payload: FacturarSaleRequest): string | null {
  const docTipo = payload.docTipo ?? 99
  const docNro = payload.docNro ?? 0
  const condicion = payload.condicionIvaReceptor ?? 5
  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(condicion)

  if (docTipo === 80 && docNro > 0 && condicion === 5 && !isComprobanteClaseB(tipo)) {
    return "Con CUIT/CUIL (docTipo 80) y condición Consumidor final (5) solo corresponde Factura B a monotributo u otros receptores no RI. Para un RI usá Factura A (tipo 1) con condición 1."
  }

  if (docTipo === 80 && docNro > 0 && condicion === 1 && isComprobanteClaseB(tipo)) {
    return "El receptor es Responsable Inscripto (condición 1): corresponde Factura A (tipo 1), no Factura B."
  }

  return null
}

function applyWsfeCondicionToPayload(payload: FacturarSaleRequest): FacturarSaleRequest {
  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor ?? 5)
  const condicionRaw = payload.condicionIvaReceptor ?? 5
  const condicionWsfe = normalizeCondicionIvaReceptorForWsfe(tipo, condicionRaw)
  if (condicionWsfe === condicionRaw) return payload
  return { ...payload, tipo, condicionIvaReceptor: condicionWsfe }
}

/** Evita combinaciones inválidas (ej. Factura A + consumidor final sin CUIT). */
export function validateFacturarPayloadCoherence(payload: FacturarSaleRequest): string | null {
  const docCondicionErr = validateReceptorDocumentoCondicion(payload)
  if (docCondicionErr) return docCondicionErr

  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor ?? 5)
  const condicion = payload.condicionIvaReceptor ?? 5
  const docTipo = payload.docTipo ?? 99
  const docNro = payload.docNro ?? 0
  const tipoEsperado = resolveTipoComprobanteFromCondicionIvaReceptor(condicion)

  if (tipo !== tipoEsperado) {
    return `El tipo de comprobante (${tipo}) no coincide con la condición IVA del receptor (${condicion}). Debería ser tipo ${tipoEsperado}. Revisá la configuración o los datos del cliente antes de emitir.`
  }

  if (tipo === 1) {
    if (condicion !== 1) {
      return "Factura A solo corresponde a un receptor Responsable Inscripto (condición IVA 1)."
    }
    if (docTipo !== 80 || docNro <= 0) {
      return "Factura A requiere el CUIT del receptor (docTipo 80 con 11 dígitos)."
    }
  }

  if (condicion === 1 && (docTipo !== 80 || docNro <= 0)) {
    return "Un receptor Responsable Inscripto requiere CUIT válido (docTipo 80)."
  }

  return null
}

/** CUIT/CUIL del cliente (campo nuevo o legacy `primary_tax_id`). */
export function clienteCuitDigitos(cliente?: Cliente | null): string {
  const raw = cliente?.cuil_cuit ?? cliente?.primary_tax_id ?? ""
  return soloDigitosDoc(raw)
}

/** Arma docTipo/docNro/condición/tipo según el cliente del ERP. */
export function applyClienteToFacturarForm(
  base: FacturarSaleRequest,
  cliente: Cliente | null
): FacturarSaleRequest {
  if (!cliente) {
    const fiscal = resolveFacturacionDesdeCliente(null)
    return {
      ...base,
      docTipo: 99,
      docNro: 0,
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipo: fiscal.tipoComprobante,
    }
  }

  const fiscal = resolveFacturacionDesdeCliente(cliente)
  const cuit = clienteCuitDigitos(cliente)

  if (cuit.length === 11) {
    return {
      ...base,
      docTipo: 80,
      docNro: parseInt(cuit, 10),
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipo: fiscal.tipoComprobante,
    }
  }

  return {
    ...base,
    docTipo: 99,
    docNro: 0,
    condicionIvaReceptor: fiscal.condicionIvaReceptor,
    tipo: fiscal.tipoComprobante,
  }
}

/**
 * Incorpora hints del backend (GET /facturar/sugerencia).
 * Si el cliente ERP ya tiene datos fiscales, no pisa condición/tipo/doc (evita Factura A + CF).
 */
export function mergeSugerenciaIntoFacturarForm(
  form: FacturarSaleRequest,
  sugerencia: FacturarSugerenciaData | null | undefined,
  cliente?: Cliente | null
): FacturarSaleRequest {
  if (!sugerencia) return form

  if (sugerencia.emisorRegimen) {
    setEmisorRegimenFromApi(sugerencia.emisorRegimen)
  }

  const next: FacturarSaleRequest = { ...form }
  const erpFiscal = clienteTieneDatosFiscalesErp(cliente)

  if (
    !erpFiscal &&
    sugerencia.condicionIvaReceptor != null &&
    Number.isFinite(sugerencia.condicionIvaReceptor) &&
    sugerencia.condicionIvaReceptor > 0
  ) {
    next.condicionIvaReceptor = sugerencia.condicionIvaReceptor
  }

  const condicionFinal = next.condicionIvaReceptor ?? 5
  const tipoSugeridoApi = sugerencia.sugerencia?.tipo
  if (tipoSugeridoApi != null && Number.isFinite(tipoSugeridoApi) && tipoSugeridoApi > 0) {
    next.tipo = tipoSugeridoApi
  } else {
    next.tipo = resolveTipoComprobanteFromCondicionIvaReceptor(condicionFinal)
  }

  return next
}

/**
 * Body definitivo para POST /facturar: prioriza datos fiscales del cliente cargado
 * (no deja consumidor final si hay CUIT en el ERP).
 */
export function buildFacturarPayload(
  form: FacturarSaleRequest,
  cliente: Cliente | null
): FacturarSaleRequest {
  if (cliente) {
    const fromCliente = applyClienteToFacturarForm(form, cliente)
    const payload: FacturarSaleRequest = {
      ...form,
      ...fromCliente,
      concepto: form.concepto ?? fromCliente.concepto,
      force: form.force,
      fechaServicioDesde: form.fechaServicioDesde,
      fechaServicioHasta: form.fechaServicioHasta,
      cuitEmisor: form.cuitEmisor,
      puntoVenta: form.puntoVenta,
    }
    payload.tipo = resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor ?? 5)
    return applyWsfeCondicionToPayload(payload)
  }

  const payload: FacturarSaleRequest = { ...form }

  if (payload.docTipo === 80 && payload.docNro != null && payload.docNro > 0) {
    return applyWsfeCondicionToPayload(payload)
  }

  payload.docTipo = 99
  payload.docNro = 0
  payload.condicionIvaReceptor = payload.condicionIvaReceptor ?? 5
  payload.tipo =
    payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor)
  return applyWsfeCondicionToPayload(payload)
}

export function validateFacturarReceptorFiscal(
  sale: { client_id?: number | null; client_name?: string | null },
  cliente: Cliente | null,
  payload: FacturarSaleRequest
): string | null {
  if (!sale.client_id) return null

  const cuit = clienteCuitDigitos(cliente)
  const esConsumidorFinalAfip = payload.docTipo === 99 && (payload.docNro ?? 0) === 0

  if (cuit.length === 11 && esConsumidorFinalAfip) {
    return "La venta tiene un cliente con CUIT/CUIL en el ERP, pero el comprobante se emitiría sin documento (consumidor final). Revisá que el cliente tenga el CUIT cargado o consultá el padrón ARCA antes de emitir."
  }

  if (cliente) {
    const esperada = resolveFacturacionDesdeCliente(cliente).condicionIvaReceptor
    const enviada = payload.condicionIvaReceptor ?? 5
    if (esperada !== 5 && enviada === 5 && cuit.length === 11) {
      return `La condición IVA del cliente no es consumidor final, pero el comprobante se enviaría como condición ${enviada}. Revisá los datos fiscales del cliente antes de emitir.`
    }

    const tieneCondicionEnErp =
      normalizeTaxConditionFromApi(cliente.tax_condition) != null ||
      (cliente.condicion_iva_receptor != null && cliente.condicion_iva_receptor > 0)
    if (
      cuit.length === 11 &&
      !tieneCondicionEnErp &&
      cliente.personeria !== "persona_juridica" &&
      (payload.docTipo ?? 99) === 80
    ) {
      return "El cliente tiene CUIT/CUIL pero falta la condición IVA en el ERP. Editá el cliente, consultá padrón ARCA en la confirmación, o verificá que la condición fiscal sea la correcta antes de emitir."
    }
  }

  const nombre = (sale.client_name ?? cliente?.name ?? "").trim().toLowerCase()
  if (
    esConsumidorFinalAfip &&
    nombre &&
    nombre !== "consumidor final" &&
    !cliente
  ) {
    return "La venta tiene un cliente asignado pero no se pudieron cargar sus datos fiscales. Esperá a que termine la carga o revisá el cliente en el ERP antes de emitir."
  }

  const incoherencia = validateFacturarPayloadCoherence(payload)
  if (incoherencia) return incoherencia

  return null
}

/** Defaults de configuración + cliente + sugerencia API (flujo de emisión). */
export function buildFacturarFormForSale(
  cliente: Cliente | null,
  sugerencia?: FacturarSugerenciaData | null
): FacturarSaleRequest {
  const base = buildDefaultFacturarFormRequest()
  const withCliente = applyClienteToFacturarForm(base, cliente)
  return mergeSugerenciaIntoFacturarForm(withCliente, sugerencia, cliente)
}
