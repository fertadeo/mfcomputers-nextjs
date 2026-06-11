import type { Cliente, FacturarSaleRequest, FacturarSugerenciaData } from "@/lib/api"
import {
  resolveFacturacionDesdeCliente,
  resolveTipoComprobanteFromCondicionIvaReceptor,
} from "@/lib/facturacion-cliente-fiscal"
import { buildDefaultFacturarFormRequest } from "@/lib/facturacion-settings"
import { soloDigitosDoc } from "@/lib/facturacion-receptor-doc"

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

/** Incorpora hints del backend (GET /facturar/sugerencia) sin pisar CUIT ya resuelto. */
export function mergeSugerenciaIntoFacturarForm(
  form: FacturarSaleRequest,
  sugerencia: FacturarSugerenciaData | null | undefined
): FacturarSaleRequest {
  if (!sugerencia) return form

  const next: FacturarSaleRequest = { ...form }

  if (
    sugerencia.condicionIvaReceptor != null &&
    Number.isFinite(sugerencia.condicionIvaReceptor) &&
    sugerencia.condicionIvaReceptor > 0
  ) {
    next.condicionIvaReceptor = sugerencia.condicionIvaReceptor
    next.tipo = resolveTipoComprobanteFromCondicionIvaReceptor(sugerencia.condicionIvaReceptor)
  }

  if (sugerencia.sugerencia?.tipo != null && Number.isFinite(sugerencia.sugerencia.tipo)) {
    next.tipo = sugerencia.sugerencia.tipo
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
    return {
      ...form,
      ...fromCliente,
      concepto: form.concepto ?? fromCliente.concepto,
      force: form.force,
      fechaServicioDesde: form.fechaServicioDesde,
      fechaServicioHasta: form.fechaServicioHasta,
      cuitEmisor: form.cuitEmisor,
      puntoVenta: form.puntoVenta,
    }
  }

  const payload: FacturarSaleRequest = { ...form }

  if (payload.docTipo === 80 && payload.docNro != null && payload.docNro > 0) {
    return payload
  }

  payload.docTipo = 99
  payload.docNro = 0
  payload.condicionIvaReceptor = payload.condicionIvaReceptor ?? 5
  payload.tipo =
    payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor)
  return payload
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

  return null
}

/** Defaults de configuración + cliente + sugerencia API (flujo de emisión). */
export function buildFacturarFormForSale(
  cliente: Cliente | null,
  sugerencia?: FacturarSugerenciaData | null
): FacturarSaleRequest {
  const base = buildDefaultFacturarFormRequest()
  const withCliente = applyClienteToFacturarForm(base, cliente)
  return mergeSugerenciaIntoFacturarForm(withCliente, sugerencia)
}
