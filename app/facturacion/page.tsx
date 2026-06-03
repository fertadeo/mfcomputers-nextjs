"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  LayoutTemplate,
  RefreshCcw,
  Search,
  Loader2,
  Send,
} from "lucide-react"
import {
  facturarSale,
  getClienteById,
  getRepairOrders,
  getSale,
  getSales,
  resolveSaleIdForRepairOrderFacturacion,
  type Cliente,
  type FacturarSaleRequest,
  type FacturarSaleError,
  type RepairOrder,
  type Sale,
} from "@/lib/api"
import {
  REPAIR_ORDER_FACTURABLE_STATUSES,
  billableStats,
  filterBillables,
  mergeFacturacionBillables,
  type ArcaStatus,
  type BillableRow,
} from "@/lib/facturacion-billables"
import { cacheFacturacionEmision, getCachedFacturacionEmision } from "@/lib/facturacion-emision-cache"
import { buildArcaInvoicePdfInput } from "@/lib/build-arca-invoice-pdf-input"
import { generateArcaInvoicePdfFromBuildArgs, type GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import { fetchSaleArcaEmision } from "@/lib/fetch-sale-arca-emision"
import {
  buildDefaultFacturarFormRequest,
  getEmitirConDefaultsGuardados,
  getStoredFacturacionCuitEmisor,
  saveFacturacionFormDefaults,
} from "@/lib/facturacion-settings"
import {
  CONDICIONES_IVA_RECEPTOR,
  formatComprobanteAfipReferencia,
  getNotaCreditoTipoForFactura,
  getTipoComprobanteLabel,
  TIPOS_COMPROBANTE_AFIP,
} from "@/lib/facturacion-comprobantes"
import {
  extractFacturacionEmisionFromResponse,
  formatFacturacionErrorForUi,
  resolveFacturacionError,
  resolveFacturacionErrorFromSale,
  type FacturacionErrorInfo,
} from "@/lib/facturacion-errors"
import { ArcaInvoiceTemplateDialog } from "@/components/arca-invoice-template-dialog"
import { ArcaInvoiceTemplatePreview } from "@/components/arca-invoice-template-preview"
import { FacturacionEmitConfirmDialog } from "@/components/facturacion-emit-confirm-dialog"
import { TipoComprobanteBadge } from "@/components/tipo-comprobante-badge"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import {
  labelCondicionIvaReceptor,
  resolveFacturacionDesdeCliente,
  resolveTipoComprobanteFromCondicionIvaReceptor,
} from "@/lib/facturacion-cliente-fiscal"
import type { ArcaPadronResult } from "@/lib/arca-padron"
import {
  applyPadronToFacturarForm,
  applyReceptorCuitToFacturarForm,
} from "@/lib/facturacion-receptor-doc"
import {
  loadFacturacionPreviewLines,
  type FacturacionPreviewLine,
} from "@/lib/facturacion-preview-lines"

const ARCA_STATUS_OPTIONS = ["all", "pending", "success", "error", "not_issued"] as const

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Procesando", variant: "secondary" },
  success: { label: "Facturado", variant: "default" },
  error: { label: "Error", variant: "destructive" },
  not_issued: { label: "Sin emitir", variant: "outline" },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value)

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("es-AR")
}

/** Venta real o vista previa para UI (órdenes de reparación sin venta vinculada aún). */
function billableToDisplaySale(row: BillableRow | null): Sale | null {
  if (!row) return null
  if (row.sale) return row.sale
  if (row.kind !== "repair_order" || !row.repairOrder) return null
  const arcaStatus = row.arcaStatus === "not_issued" ? null : row.arcaStatus
  return {
    id: row.linkedSaleId ?? 0,
    sale_number: row.reference,
    client_id: row.clientId,
    client_name: row.clientName,
    total_amount: row.totalAmount,
    payment_method: "efectivo",
    sale_date: row.date,
    arca_status: arcaStatus,
    arca_cae: row.arcaCae,
    arca_cae_vto: row.arcaCaeVto,
    arca_last_attempt_at: row.arcaLastAttemptAt,
    arca_error_code: row.arcaErrorCode,
    arca_error_message: row.arcaErrorMessage,
    created_at: row.repairOrder.created_at,
    updated_at: row.repairOrder.updated_at,
  }
}

/** Solo dígitos para validar CUIT/CUIL/DNI */
function soloDigitos(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

/** Formato visual CUIT/CUIL argentino (11 dígitos) */
function formatCuitMostrar(raw?: string | null): string {
  const d = soloDigitos(raw)
  if (d.length !== 11) return raw?.trim() || "—"
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

/**
 * Arma el body definitivo para consumidor final (condición IVA 5):
 * - Sin CUIT/CUIL de 11 dígitos en cliente → AFIP docTipo 99, docNro 0.
 * - Con CUIT/CUIL válido → docTipo 80 y número sin sobrescribir si el usuario ya eligió otro tipo distinto de 99.
 */
function buildFacturarPayload(form: FacturarSaleRequest, cliente: Cliente | null): FacturarSaleRequest {
  const payload: FacturarSaleRequest = { ...form }

  if (form.docTipo === 99) {
    payload.docTipo = 99
    payload.docNro = 0
    return payload
  }

  if (form.docTipo === 80 && form.docNro != null && form.docNro > 0) {
    payload.docTipo = 80
    payload.docNro = form.docNro
    return payload
  }

  if (payload.condicionIvaReceptor !== 5) return payload

  const cuil = soloDigitos(cliente?.cuil_cuit)
  const tieneCuit11 = cuil.length === 11

  if (!tieneCuit11) {
    payload.docTipo = 99
    payload.docNro = 0
    return payload
  }

  payload.docTipo = 80
  payload.docNro = parseInt(cuil, 10)
  return payload
}

function getBillableEmittedTipo(row: BillableRow): number | null {
  if (row.arcaStatus !== "success") return null
  const saleId = row.sale?.id ?? row.linkedSaleId ?? null
  if (!saleId) return null
  const cached = getCachedFacturacionEmision(saleId)
  const tipo = cached?.emision?.tipo ?? cached?.facturarPayload?.tipo
  return typeof tipo === "number" && Number.isFinite(tipo) ? tipo : null
}

export default function FacturacionPage() {
  const [billables, setBillables] = useState<BillableRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof ARCA_STATUS_OPTIONS)[number]>("all")
  const [selectedBillableKey, setSelectedBillableKey] = useState<string | null>(null)
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false)
  /** `view` = solo lectura del comprobante ya emitido; `emit` = formulario de facturación */
  const [invoiceModalMode, setInvoiceModalMode] = useState<"emit" | "view">("emit")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<FacturacionErrorInfo | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [retryAfterHint, setRetryAfterHint] = useState<string | null>(null)
  const [form, setForm] = useState<FacturarSaleRequest>(() => buildDefaultFacturarFormRequest())
  const [showAdvancedEmitForm, setShowAdvancedEmitForm] = useState(() => !getEmitirConDefaultsGuardados())
  const [defaultsSavedHint, setDefaultsSavedHint] = useState(false)
  const [isGeneratingArcaPdf, setIsGeneratingArcaPdf] = useState(false)
  const [creditNoteSale, setCreditNoteSale] = useState<Sale | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [viewInvoiceData, setViewInvoiceData] = useState<GenerateArcaInvoicePdfParams | null>(null)
  const [viewInvoiceLoading, setViewInvoiceLoading] = useState(false)
  const [viewInvoiceError, setViewInvoiceError] = useState<string | null>(null)
  const [viewInvoiceIncomplete, setViewInvoiceIncomplete] = useState(false)

  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)
  const [modalClienteLoading, setModalClienteLoading] = useState(false)
  const [isConfirmEmitOpen, setIsConfirmEmitOpen] = useState(false)
  const [confirmLines, setConfirmLines] = useState<FacturacionPreviewLine[]>([])
  const [confirmLinesLoading, setConfirmLinesLoading] = useState(false)
  const [confirmLinesError, setConfirmLinesError] = useState<string | null>(null)

  const [emisorCuitMostrar, setEmisorCuitMostrar] = useState<string>(() => {
    const stored = typeof window !== "undefined" ? getStoredFacturacionCuitEmisor() : null
    if (stored) return formatCuitMostrar(stored)
    const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.trim() : ""
    if (env) return formatCuitMostrar(env)
    return "Configurá el CUIT en Configuración → Facturación ARCA, variable NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR o FACTURADOR_CUIT_EMISOR en el servidor."
  })

  useEffect(() => {
    const stored = getStoredFacturacionCuitEmisor()
    if (stored) {
      setEmisorCuitMostrar(formatCuitMostrar(stored))
      return
    }
    const env = process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.trim()
    if (env) setEmisorCuitMostrar(formatCuitMostrar(env))
    else {
      setEmisorCuitMostrar(
        "Configurá el CUIT en Configuración → Facturación ARCA, variable NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR o FACTURADOR_CUIT_EMISOR en el servidor."
      )
    }
  }, [isEmitModalOpen, isConfirmEmitOpen, invoiceModalMode])

  useEffect(() => {
    if ((!isEmitModalOpen && !isConfirmEmitOpen) || invoiceModalMode !== "emit") return
    setForm(buildDefaultFacturarFormRequest())
    setShowAdvancedEmitForm(!getEmitirConDefaultsGuardados())
    setDefaultsSavedHint(false)
  }, [isEmitModalOpen, isConfirmEmitOpen, invoiceModalMode, selectedBillableKey])

  const selectedBillable = useMemo(
    () => billables.find((row) => row.key === selectedBillableKey) ?? null,
    [billables, selectedBillableKey]
  )

  const selectedSale = useMemo(() => billableToDisplaySale(selectedBillable), [selectedBillable])

  const creditNotePreview = useMemo(() => {
    if (!creditNoteSale) return null
    const cached = getCachedFacturacionEmision(creditNoteSale.id)
    const tipoFactura =
      cached?.emision.tipo ?? cached?.facturarPayload.tipo ?? buildDefaultFacturarFormRequest().tipo ?? 6
    const ncTipo = getNotaCreditoTipoForFactura(tipoFactura)
    const pv = cached?.emision.puntoVenta ?? cached?.facturarPayload.puntoVenta
    const numero = cached?.emision.numero
    return {
      cached,
      tipoFactura,
      ncTipo,
      ncLabel: ncTipo != null ? getTipoComprobanteLabel(ncTipo) : null,
      facturaRef:
        numero != null
          ? formatComprobanteAfipReferencia(tipoFactura, pv, numero)
          : null,
      importe: cached?.emision.importe ?? creditNoteSale.total_amount,
      cae: creditNoteSale.arca_cae ?? cached?.emision.cae,
    }
  }, [creditNoteSale])

  const filteredBillables = useMemo(
    () => filterBillables(billables, query, statusFilter as ArcaStatus | "all"),
    [billables, query, statusFilter]
  )

  const stats = useMemo(() => billableStats(billables), [billables])

  const clienteFiscalSnapshot = useMemo(() => {
    if (!modalCliente) return null
    const fiscal = resolveFacturacionDesdeCliente(modalCliente)
    return {
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipoComprobante: fiscal.tipoComprobante,
    }
  }, [modalCliente])

  const loadBillables = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const [salesRes, ...repairResponses] = await Promise.all([
        getSales({ page: 1, limit: 200 }),
        ...REPAIR_ORDER_FACTURABLE_STATUSES.map((status) =>
          getRepairOrders({ status, page: 1, limit: 100 })
        ),
      ])
      const sales = salesRes?.data?.sales ?? []
      const repairOrders = repairResponses.flatMap((res) => {
        const data = res.data as { repair_orders?: RepairOrder[] }
        return data?.repair_orders ?? []
      })
      const merged = mergeFacturacionBillables(sales, repairOrders)
      setBillables(merged)
      if (!selectedBillableKey && merged.length > 0) setSelectedBillableKey(merged[0].key)
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "No se pudo obtener ventas y reparaciones para facturación."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadBillables()
  }, [])

  useEffect(() => {
    if (
      (!isEmitModalOpen && !isConfirmEmitOpen) ||
      selectedBillableKey == null ||
      invoiceModalMode !== "emit"
    ) {
      setModalCliente(null)
      setModalClienteLoading(false)
      return
    }

    const sale = selectedSale
    if (!sale) {
      setModalClienteLoading(false)
      return
    }

    let cancelled = false
    setModalClienteLoading(true)
    setModalCliente(null)

    setForm(buildDefaultFacturarFormRequest())

    const cargar = async () => {
      try {
        if (!sale.client_id) {
          if (!cancelled) {
            setModalCliente(null)
            const fiscal = resolveFacturacionDesdeCliente(null)
            setForm((prev) => ({
              ...prev,
              docTipo: 99,
              docNro: 0,
              condicionIvaReceptor: fiscal.condicionIvaReceptor,
              tipo: fiscal.tipoComprobante,
            }))
            console.log("[FACTURAR UI] Venta sin client_id → consumidor final (docTipo 99 / docNro 0).")
          }
          return
        }

        const cliente = await getClienteById(sale.client_id)
        if (cancelled) return
        setModalCliente(cliente)

        const fiscal = resolveFacturacionDesdeCliente(cliente)
        const cuil = soloDigitos(cliente.cuil_cuit)
        if (cuil.length === 11) {
          setForm((prev) => ({
            ...prev,
            docTipo: 80,
            docNro: parseInt(cuil, 10),
            condicionIvaReceptor: fiscal.condicionIvaReceptor,
            tipo: fiscal.tipoComprobante,
          }))
          console.log("[FACTURAR UI] Cliente con CUIT/CUIL 11 dígitos → docTipo 80, docNro derivado del cliente.")
        } else {
          setForm((prev) => ({
            ...prev,
            docTipo: 99,
            docNro: 0,
            condicionIvaReceptor: fiscal.condicionIvaReceptor,
            tipo: fiscal.tipoComprobante,
          }))
          console.log(
            "[FACTURAR UI] Cliente sin CUIT válido o venta informal → consumidor final (docTipo 99 / docNro 0)."
          )
        }
      } catch (e) {
        console.warn("[FACTURAR UI] No se pudo obtener el cliente; se usa consumidor final (docTipo 99 / docNro 0).", e)
        if (!cancelled) {
          setModalCliente(null)
          const fiscal = resolveFacturacionDesdeCliente(null)
          setForm((prev) => ({
            ...prev,
            docTipo: 99,
            docNro: 0,
            condicionIvaReceptor: fiscal.condicionIvaReceptor,
            tipo: fiscal.tipoComprobante,
          }))
        }
      } finally {
        if (!cancelled) setModalClienteLoading(false)
      }
    }

    void cargar()
    return () => {
      cancelled = true
    }
    // Nota: no incluir `sales` en dependencias: si se refresca el listado con el modal abierto,
    // no debe reiniciarse el formulario ni volver a cargar cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir modal o cambiar comprobante seleccionado
  }, [isEmitModalOpen, isConfirmEmitOpen, selectedBillableKey, invoiceModalMode, selectedSale])

  const requestEmitConfirmation = () => {
    if (!selectedBillable || !selectedSale) {
      setErrorMsg("Seleccioná una venta u orden de reparación antes de facturar.")
      return
    }

    if ((form.concepto === 2 || form.concepto === 3) && (!form.fechaServicioDesde || !form.fechaServicioHasta)) {
      setErrorMsg("Para concepto 2 o 3 tenés que indicar fecha de servicio desde y hasta (YYYY-MM-DD).")
      setIsEmitModalOpen(true)
      setShowAdvancedEmitForm(true)
      return
    }

    setErrorMsg(null)
    setErrorTitle(null)
    setErrorDetail(null)
    setIsConfirmEmitOpen(true)
  }

  const startEmitFromTable = (rowKey: string) => {
    setSelectedBillableKey(rowKey)
    setInvoiceModalMode("emit")
    setIsEmitModalOpen(false)
    setErrorMsg(null)
    setIsConfirmEmitOpen(true)
  }

  useEffect(() => {
    if (!isConfirmEmitOpen || !selectedBillable) return

    let cancelled = false
    setConfirmLinesLoading(true)
    setConfirmLinesError(null)

    void (async () => {
      try {
        const lines = await loadFacturacionPreviewLines(selectedBillable)
        if (cancelled) return
        setConfirmLines(lines)
        if (lines.length === 0) {
          setConfirmLinesError("No hay ítems para mostrar en el comprobante.")
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "No se pudo cargar el detalle del comprobante."
        setConfirmLinesError(msg)
        setConfirmLines([])
      } finally {
        if (!cancelled) setConfirmLinesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar al abrir confirmación o cambiar fila
  }, [isConfirmEmitOpen, selectedBillableKey, invoiceModalMode])

  useEffect(() => {
    if (!isConfirmEmitOpen) {
      setConfirmLines([])
      setConfirmLinesError(null)
      setConfirmLinesLoading(false)
    }
  }, [isConfirmEmitOpen])

  useEffect(() => {
    if (!isEmitModalOpen || invoiceModalMode !== "view" || !selectedSale) {
      setViewInvoiceData(null)
      setViewInvoiceError(null)
      setViewInvoiceIncomplete(false)
      setViewInvoiceLoading(false)
      return
    }

    let cancelled = false
    const billable = selectedBillable

    async function loadComprobantePreview() {
      setViewInvoiceLoading(true)
      setViewInvoiceError(null)
      setViewInvoiceData(null)

      if (!selectedSale) {
        if (!cancelled) setViewInvoiceLoading(false)
        return
      }

      let saleForArca: Sale = selectedSale
      if (saleForArca.id < 1 && billable?.linkedSaleId) {
        try {
          const saleRes = await getSale(billable.linkedSaleId)
          saleForArca = { ...(saleRes.data as Sale), client_name: billable.clientName }
        } catch {
          if (!cancelled) {
            setViewInvoiceError("No se pudo cargar la venta vinculada a esta reparación.")
            setViewInvoiceLoading(false)
          }
          return
        }
      } else if (saleForArca.id < 1) {
        if (!cancelled) {
          setViewInvoiceError("Esta reparación no tiene venta vinculada para mostrar el comprobante.")
          setViewInvoiceLoading(false)
        }
        return
      }

      const resolved = await fetchSaleArcaEmision(saleForArca)
      if (!resolved) {
        if (!cancelled) {
          setViewInvoiceError("No hay CAE registrado para este comprobante.")
          setViewInvoiceLoading(false)
        }
        return
      }

      try {
        let cliente = modalCliente
        if (saleForArca.client_id && (!cliente || cliente.id !== saleForArca.client_id)) {
          try {
            cliente = await getClienteById(saleForArca.client_id)
          } catch {
            cliente = null
          }
        }

        const data = await buildArcaInvoicePdfInput({
          saleId: saleForArca.id,
          emision: resolved.emision,
          facturarPayload: resolved.facturarPayload,
          cliente,
          saleSnapshot: saleForArca,
          previewAllowMissingNumero: true,
        })

        if (!cancelled) {
          setViewInvoiceData(data)
          setViewInvoiceIncomplete(resolved.incomplete)
        }
      } catch (e) {
        if (!cancelled) {
          setViewInvoiceError(
            e instanceof Error ? e.message : "No se pudo cargar la vista del comprobante."
          )
        }
      } finally {
        if (!cancelled) setViewInvoiceLoading(false)
      }
    }

    void loadComprobantePreview()
    return () => {
      cancelled = true
    }
  }, [isEmitModalOpen, invoiceModalMode, selectedSale, selectedBillable, modalCliente])

  const downloadArcaPdfForSale = async (
    sale: Sale,
    emisionOverride?: ReturnType<typeof extractFacturacionEmisionFromResponse>,
    payloadOverride?: FacturarSaleRequest,
    options?: { reportErrorOnPage?: boolean }
  ) => {
    const resolved =
      emisionOverride != null
        ? {
            emision: emisionOverride,
            facturarPayload: payloadOverride ?? getCachedFacturacionEmision(sale.id)?.facturarPayload ?? buildDefaultFacturarFormRequest(),
            incomplete: emisionOverride.numero == null || emisionOverride.numero < 1,
            sources: ["session"] as const,
          }
        : await fetchSaleArcaEmision(sale)

    if (!resolved?.emision.cae) {
      const msg =
        "No hay datos de emisión guardados para esta venta. Emití nuevamente en esta sesión o usá el PDF de MultiCUIT."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw new Error(msg)
    }

    if (resolved.incomplete) {
      const msg =
        "No se puede generar el PDF: falta el número de comprobante AFIP. Pedí al backend que persista punto de venta y número al emitir."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw new Error(msg)
    }

    const emision = resolved.emision

    setIsGeneratingArcaPdf(true)
    try {
      let cliente = modalCliente
      if (sale.client_id && (!cliente || cliente.id !== sale.client_id)) {
        try {
          cliente = await getClienteById(sale.client_id)
        } catch {
          cliente = null
        }
      }
      await generateArcaInvoicePdfFromBuildArgs({
        saleId: sale.id,
        emision,
        facturarPayload: payloadOverride ?? resolved.facturarPayload,
        cliente,
        saleSnapshot: sale,
      })
    } catch (e) {
      console.error("[FACTURAR UI] Error al generar PDF ARCA:", e)
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF del comprobante ARCA."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw e instanceof Error ? e : new Error(msg)
    } finally {
      setIsGeneratingArcaPdf(false)
    }
  }

  const onSubmitFacturar = async () => {
    if (!selectedBillable || !selectedSale) {
      setErrorMsg("Seleccioná una venta u orden de reparación antes de facturar.")
      return
    }

    if ((form.concepto === 2 || form.concepto === 3) && (!form.fechaServicioDesde || !form.fechaServicioHasta)) {
      setErrorMsg("Para concepto 2 o 3 tenés que indicar fecha de servicio desde y hasta (YYYY-MM-DD).")
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setErrorTitle(null)
    setErrorDetail(null)
    setSuccessMsg(null)
    setRetryAfterHint(null)
    try {
      let saleId = selectedSale.id
      let saleForArca = selectedSale

      if (selectedBillable.kind === "repair_order") {
        saleId = await resolveSaleIdForRepairOrderFacturacion(
          selectedBillable.id,
          selectedBillable.linkedSaleId
        )
        const saleRes = await getSale(saleId)
        saleForArca = { ...(saleRes.data as Sale), client_name: selectedSale.client_name }
      }

      const payload = buildFacturarPayload(form, modalCliente)
      console.log("[FACTURAR UI] Emitiendo comprobante:", {
        billableKind: selectedBillable.kind,
        saleId,
        reference: selectedBillable.reference,
        clientId: selectedSale.client_id,
        payload,
        payloadJson: JSON.stringify(payload),
        emisorCuitUi: emisorCuitMostrar,
        receptorDoc: {
          docTipo: payload.docTipo,
          docNro: payload.docNro,
          clienteCuilEnErp: modalCliente?.cuil_cuit ?? null,
        },
      })

      const response = await facturarSale(saleId, payload)
      const emision = extractFacturacionEmisionFromResponse(response)
      const cae = emision?.cae ?? response?.data?.arca?.cae ?? response?.data?.sale?.arca_cae
      const vto = emision?.vencimientoCaeIso
      const partes = ["Factura emitida correctamente en ARCA."]
      if (cae) partes.push(`CAE: ${cae}.`)
      if (vto) partes.push(`Vencimiento CAE: ${vto}.`)
      if (emision?.facturaId) partes.push(`ID comprobante: ${emision.facturaId}.`)
      if (emision) {
        cacheFacturacionEmision(saleId, emision, payload)
      }
      setSuccessMsg(partes.join(" "))
      if (emision) {
        try {
          await downloadArcaPdfForSale(saleForArca, emision, payload, { reportErrorOnPage: false })
          setSuccessMsg((prev) => `${prev ?? ""} PDF ARCA descargado.`.trim())
        } catch (pdfErr) {
          const pdfMsg = pdfErr instanceof Error ? pdfErr.message : "Error al generar PDF"
          setSuccessMsg((prev) => `${prev ?? ""} (PDF no descargado: ${pdfMsg})`.trim())
        }
      }
      setIsConfirmEmitOpen(false)
      setIsEmitModalOpen(false)
      await loadBillables()
    } catch (error: unknown) {
      const err = error as FacturarSaleError
      const isNetwork =
        error instanceof TypeError ||
        err?.name === "TypeError" ||
        /failed to fetch|network|load failed/i.test(String(err?.message ?? ""))

      const resolved =
        err?.facturacionError ??
        resolveFacturacionError({
          code: isNetwork ? "NETWORK_ERROR" : err?.code,
          httpStatus: err?.status,
          rawMessage: err?.message,
          requestId: err?.requestId,
        })

      console.error("[FACTURAR UI] Error al emitir comprobante:", {
        message: err?.message,
        name: err?.name,
        status: err?.status,
        code: resolved.code,
        retryAfter: err?.retryAfter,
        requestId: err?.requestId,
        facturacionError: resolved,
        data: err?.data,
        responsePayload: err?.responsePayload,
        rawResponseText: err?.rawResponseText,
        stack: err?.stack,
      })

      setErrorTitle(resolved.title)
      setErrorDetail(resolved)
      setErrorMsg(formatFacturacionErrorForUi(resolved, err?.requestId))

      if (err?.status === 429 && err?.retryAfter != null) {
        setRetryAfterHint(`Límite alcanzado. Reintentá luego de: ${String(err.retryAfter)}.`)
      } else if (resolved.code === "RATE_LIMITED" && err?.retryAfter != null) {
        setRetryAfterHint(`Reintentá después de: ${String(err.retryAfter)}.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "finanzas", "admin"]}>
      <ERPLayout activeItem="facturacion">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Facturación ARCA</h1>
              <p className="text-muted-foreground">
                Emisión vía MF API. Predeterminado:{" "}
                <strong>{getTipoComprobanteLabel(buildDefaultFacturarFormRequest().tipo)}</strong>
                {" — "}
                <Link href="/configuracion?tab=facturacion" className="text-primary underline-offset-4 hover:underline">
                  Configurar en Facturación ARCA
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Ver plantilla factura
              </Button>
              <Button variant="outline" onClick={() => void loadBillables()} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar ventas
              </Button>
            </div>
          </div>

          <ArcaInvoiceTemplateDialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} />

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ventas cargadas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Facturadas</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" /> {stats.success}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pendientes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-amber-600">
                <Clock3 className="h-5 w-5" /> {stats.pending}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Con error</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-red-600">
                <AlertTriangle className="h-5 w-5" /> {stats.error}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contrato y reglas operativas</CardTitle>
              <CardDescription>Precondiciones y postcondiciones para UI, QA y soporte.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Alert
                variant="info"
                title="Precondiciones"
                description="Venta existente con ítems válidos. Para concepto 2 o 3 se requieren fechas de servicio en formato YYYY-MM-DD."
              />
              <Alert
                variant="success"
                title="Postcondiciones"
                description="Se persisten arca_status, arca_factura_id, arca_cae y trazabilidad de intento/error en sales."
              />
            </CardContent>
          </Card>

          {errorMsg ? (
            <Alert
              variant={errorDetail?.severity === "warning" ? "warning" : "error"}
              title={errorTitle ?? "No se pudo completar la facturación"}
              description={
                <span className="block space-y-2">
                  <span className="block">{errorMsg}</span>
                  {errorDetail?.code ? (
                    <span className="text-muted-foreground block text-xs font-mono">Código: {errorDetail.code}</span>
                  ) : null}
                  {errorDetail?.blockBlindReemit ? (
                    <span className="block text-xs font-medium">
                      No reemitas con un número nuevo hasta reconciliar con soporte o MultiCUIT.
                    </span>
                  ) : null}
                </span>
              }
            />
          ) : null}
          {retryAfterHint ? <Alert variant="warning" title="Backoff recomendado" description={retryAfterHint} /> : null}
          {successMsg ? <Alert variant="success" title="Facturación realizada" description={successMsg} /> : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ventas y reparaciones facturables
              </CardTitle>
              <CardDescription>
                Incluye ventas POS y órdenes de reparación en estado Aceptado o Entregado. Facturadas: ver comprobante, reemitir o anular por error con nota de crédito (cuando el backend lo habilite).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar por venta, reparación, cliente o ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof ARCA_STATUS_OPTIONS)[number])}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Estado ARCA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="not_issued">Sin emitir</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado ARCA</TableHead>
                    <TableHead>Tipo factura</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>Cargando comprobantes...</TableCell>
                    </TableRow>
                  ) : filteredBillables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No hay ventas ni reparaciones para los filtros aplicados.</TableCell>
                    </TableRow>
                  ) : (
                    filteredBillables.map((row) => {
                      const status = row.arcaStatus
                      const emittedTipo = getBillableEmittedTipo(row)
                      return (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{row.reference}</span>
                              {row.kind === "repair_order" ? (
                                <Badge variant="outline" className="text-xs font-normal">
                                  Reparación
                                  {row.repairStatusLabel ? ` · ${row.repairStatusLabel}` : ""}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{row.clientName}</TableCell>
                          <TableCell>{formatDateTime(row.date)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={estadoBadge[status].variant}>{estadoBadge[status].label}</Badge>
                              {status === "error" && (row.arcaErrorCode || row.arcaErrorMessage) ? (
                                <p
                                  className="text-muted-foreground max-w-[220px] text-xs leading-snug"
                                  title={row.arcaErrorMessage ?? undefined}
                                >
                                  {resolveFacturacionErrorFromSale(row.arcaErrorCode, row.arcaErrorMessage)
                                    ?.title ?? row.arcaErrorCode}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {status === "success" ? (
                              emittedTipo != null ? (
                                <TipoComprobanteBadge tipo={emittedTipo} />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(row.totalAmount)}</TableCell>
                          <TableCell className="text-right">
                            {status === "success" ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-8"
                                  disabled={row.kind === "repair_order" && !row.linkedSaleId}
                                  onClick={() => {
                                    setSelectedBillableKey(row.key)
                                    setInvoiceModalMode("view")
                                    setIsEmitModalOpen(true)
                                  }}
                                >
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  Ver comprobante
                                </Button>
                                <div className="flex flex-wrap justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => startEmitFromTable(row.key)}
                                  >
                                    Reemitir
                                  </Button>
                                  {row.sale ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400"
                                      onClick={() => setCreditNoteSale(row.sale!)}
                                    >
                                      ¿Fue un error?
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEmitFromTable(row.key)}
                              >
                                Emitir comprobante
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog
            open={isEmitModalOpen}
            onOpenChange={(open) => {
              setIsEmitModalOpen(open)
              if (!open) setInvoiceModalMode("emit")
            }}
          >
            <DialogContent
              className={
                invoiceModalMode === "view"
                  ? "flex max-h-[92vh] max-w-4xl flex-col gap-0 p-0"
                  : "max-w-2xl"
              }
            >
              <DialogHeader className={invoiceModalMode === "view" ? "shrink-0 border-b px-6 py-4" : undefined}>
                <DialogTitle>{invoiceModalMode === "view" ? "Comprobante emitido" : "Emitir comprobante"}</DialogTitle>
                <DialogDescription>
                  {invoiceModalMode === "view"
                    ? selectedSale
                      ? `${selectedSale.sale_number} · ${selectedSale.client_name || "Consumidor final"} · CAE ${selectedSale.arca_cae ?? "—"}`
                      : "Comprobante ARCA / AFIP."
                    : "Backend emite en ARCA y devuelve trazabilidad normalizada."}
                </DialogDescription>
              </DialogHeader>

              {!selectedSale ? (
                <Alert
                  variant="warning"
                  title="Sin comprobante seleccionado"
                  description="Seleccioná una venta u orden de reparación para habilitar la facturación."
                />
              ) : invoiceModalMode === "view" ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
                    {viewInvoiceLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm">Cargando comprobante…</p>
                      </div>
                    ) : viewInvoiceError ? (
                      <Alert variant="warning" title="No se puede mostrar el comprobante" description={viewInvoiceError} />
                    ) : viewInvoiceData ? (
                      <>
                        {viewInvoiceIncomplete ? (
                          <Alert
                            variant="warning"
                            className="mb-4"
                            title="Comprobante parcial"
                            description="Se muestran venta, ítems y CAE desde la API. Faltan número AFIP y QR exactos: el backend debe guardar punto de venta, tipo y número al emitir, o exponer la respuesta ARCA guardada."
                          />
                        ) : null}
                        <ArcaInvoiceTemplatePreview data={viewInvoiceData} />
                      </>
                    ) : null}
                  </div>
                  <DialogFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={
                          isGeneratingArcaPdf ||
                          !selectedSale.arca_cae ||
                          (selectedBillable?.kind === "repair_order" && !selectedBillable.linkedSaleId)
                        }
                        onClick={() => void downloadArcaPdfForSale(selectedSale, undefined, undefined, { reportErrorOnPage: true })}
                      >
                        {isGeneratingArcaPdf ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {isGeneratingArcaPdf ? "Generando…" : "Descargar PDF"}
                      </Button>
                      {selectedSale.arca_cae ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void navigator.clipboard.writeText(selectedSale.arca_cae ?? "")}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar CAE
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href="https://www.afip.gob.ar/fe/consultar/default.asp"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          AFIP
                        </a>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setInvoiceModalMode("emit")}
                    >
                      Reemitir…
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="font-medium">{selectedSale.sale_number}</div>
                    {selectedBillable?.kind === "repair_order" ? (
                      <div className="text-muted-foreground text-sm">
                        Orden de reparación
                        {selectedBillable.repairStatusLabel ? ` · ${selectedBillable.repairStatusLabel}` : ""}
                        {selectedBillable.linkedSaleId
                          ? ` · Venta vinculada #${selectedBillable.linkedSaleId}`
                          : " · Se generará la venta POS al emitir"}
                      </div>
                    ) : null}
                    <div className="text-muted-foreground">Cliente: {selectedSale.client_name || "Consumidor final"}</div>
                    <div className="text-muted-foreground">CUIT emisor: {emisorCuitMostrar}</div>
                    <div className="text-muted-foreground">
                      CUIT/CUIL receptor (ERP):{" "}
                      {modalClienteLoading
                        ? "Cargando…"
                        : soloDigitos(modalCliente?.cuil_cuit).length === 11
                          ? formatCuitMostrar(modalCliente?.cuil_cuit)
                          : !selectedSale.client_id
                            ? "Sin cliente en la venta — consumidor final (docTipo 99 / docNro 0)."
                            : "Sin CUIT/CUIL válido en cliente — consumidor final (docTipo 99 / docNro 0)."}
                    </div>
                    <div className="text-muted-foreground">Monto: {formatCurrency(selectedSale.total_amount)}</div>
                    <div className="text-muted-foreground">Último intento: {formatDateTime(selectedSale.arca_last_attempt_at)}</div>
                    <div className="text-muted-foreground">CAE actual: {selectedSale.arca_cae || "-"}</div>
                    {selectedSale.arca_cae_vto ? (
                      <div className="text-muted-foreground">Vencimiento CAE: {selectedSale.arca_cae_vto}</div>
                    ) : null}
                  </div>

                  {selectedBillable?.arcaStatus === "error" &&
                  (selectedSale.arca_error_code || selectedSale.arca_error_message) ? (
                    <Alert
                      variant="warning"
                      title={
                        resolveFacturacionErrorFromSale(
                          selectedSale.arca_error_code,
                          selectedSale.arca_error_message
                        )?.title ?? "Último intento fallido"
                      }
                      description={formatFacturacionErrorForUi(
                        resolveFacturacionErrorFromSale(
                          selectedSale.arca_error_code,
                          selectedSale.arca_error_message
                        ) ?? resolveFacturacionError({ rawMessage: selectedSale.arca_error_message })
                      )}
                    />
                  ) : null}

                  {errorMsg && isEmitModalOpen ? (
                    <Alert
                      variant={errorDetail?.severity === "warning" ? "warning" : "error"}
                      title={errorTitle ?? "Error al facturar"}
                      description={errorMsg}
                    />
                  ) : null}

                  {modalClienteLoading ? (
                    <p className="text-muted-foreground text-sm">Cargando datos fiscales del cliente…</p>
                  ) : null}

                  {!modalClienteLoading && invoiceModalMode === "emit" ? (
                    <Alert
                      variant="info"
                      title="Tipo de factura según condición fiscal"
                      description={
                        <div className="space-y-2 text-sm">
                          <p>
                            Se emitirá{" "}
                            <TipoComprobanteBadge tipo={form.tipo} className="align-middle" /> (
                            {getTipoComprobanteLabel(form.tipo)}) según{" "}
                            {modalCliente?.tax_condition
                              ? formatTaxConditionLabel(modalCliente.tax_condition)
                              : labelCondicionIvaReceptor(form.condicionIvaReceptor ?? 5)}{" "}
                            del cliente.
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Responsable inscripto → Factura A; monotributo → Factura C; consumidor final / exento →
                            Factura B. Podés ajustar en opciones avanzadas si hace falta.
                          </p>
                        </div>
                      }
                    />
                  ) : null}

                  {!showAdvancedEmitForm ? (
                    <div className="space-y-3">
                      <Alert
                        variant="info"
                        title="Emisión con configuración guardada"
                        description={
                          <div className="space-y-1 text-sm">
                            <p className="flex flex-wrap items-center gap-2">
                              Se emitirá <TipoComprobanteBadge tipo={form.tipo} /> (
                              {getTipoComprobanteLabel(form.tipo)}), condición IVA receptor{" "}
                              <strong>{form.condicionIvaReceptor}</strong> (
                              {labelCondicionIvaReceptor(form.condicionIvaReceptor ?? 5)}), concepto{" "}
                              <strong>{form.concepto === 1 ? "Productos" : form.concepto === 2 ? "Servicios" : "Productos + servicios"}</strong>.
                            </p>
                            <p className="text-muted-foreground text-xs">
                              El documento del receptor se deduce del cliente de la venta (consumidor final si no hay CUIT).
                            </p>
                          </div>
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvancedEmitForm(true)}>
                          Opciones avanzadas
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href="/configuracion?tab=facturacion">Cambiar en Configuración</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Opciones de emisión</p>
                        {getEmitirConDefaultsGuardados() ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvancedEmitForm(false)}>
                            Volver a emisión rápida
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="facturar-tipo-comprobante">Tipo de comprobante</Label>
                          <Select
                            value={String(form.tipo ?? 6)}
                            onValueChange={(value) =>
                              setForm((prev) => ({ ...prev, tipo: parseInt(value, 10) || 6 }))
                            }
                          >
                            <SelectTrigger id="facturar-tipo-comprobante" className="w-full">
                              <SelectValue placeholder="Elegí tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_COMPROBANTE_AFIP.map((t) => (
                                <SelectItem key={t.value} value={String(t.value)}>
                                  {t.label} — código {t.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-muted-foreground text-xs">
                            El tipo se sugiere automáticamente desde la condición fiscal del cliente; al cambiar la
                            condición IVA del receptor se actualiza el tipo sugerido.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facturar-condicion-iva">Condición IVA receptor</Label>
                          <Select
                            value={String(form.condicionIvaReceptor ?? 5)}
                            onValueChange={(value) => {
                              const cond = parseInt(value, 10) || 5
                              const tipo = resolveTipoComprobanteFromCondicionIvaReceptor(cond)
                              setForm((prev) => ({
                                ...prev,
                                condicionIvaReceptor: cond,
                                tipo,
                              }))
                            }}
                          >
                            <SelectTrigger id="facturar-condicion-iva" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDICIONES_IVA_RECEPTOR.map((c) => (
                                <SelectItem key={c.value} value={String(c.value)}>
                                  {c.label} ({c.value})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="facturar-concepto">Concepto</Label>
                          <Select
                            value={String(form.concepto ?? 1)}
                            onValueChange={(value) =>
                              setForm((prev) => ({ ...prev, concepto: Number(value) as 1 | 2 | 3 }))
                            }
                          >
                            <SelectTrigger id="facturar-concepto" className="w-full">
                              <SelectValue placeholder="Elegí concepto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Productos</SelectItem>
                              <SelectItem value="2">2 - Servicios</SelectItem>
                              <SelectItem value="3">3 - Productos + servicios</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facturar-doc-tipo">Tipo de documento receptor (`docTipo`)</Label>
                          <Input
                            id="facturar-doc-tipo"
                            type="number"
                            value={form.docTipo ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                docTipo: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            placeholder="80 = CUIT, 99 = consumidor final"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facturar-doc-nro">Número de documento receptor (`docNro`)</Label>
                          <Input
                            id="facturar-doc-nro"
                            value={form.docNro ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                docNro: e.target.value ? Number(e.target.value) : undefined,
                              }))
                            }
                            placeholder="Con docTipo 99 suele ser 0"
                          />
                        </div>

                        {(form.concepto === 2 || form.concepto === 3) && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="facturar-servicio-desde">Servicio — fecha desde</Label>
                              <Input
                                id="facturar-servicio-desde"
                                type="date"
                                value={form.fechaServicioDesde ?? ""}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    fechaServicioDesde: e.target.value || undefined,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="facturar-servicio-hasta">Servicio — fecha hasta</Label>
                              <Input
                                id="facturar-servicio-hasta"
                                type="date"
                                value={form.fechaServicioHasta ?? ""}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    fechaServicioHasta: e.target.value || undefined,
                                  }))
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            saveFacturacionFormDefaults({
                              tipo: form.tipo ?? 6,
                              condicionIvaReceptor: form.condicionIvaReceptor ?? 5,
                              concepto: (form.concepto ?? 1) as 1 | 2 | 3,
                            })
                            setDefaultsSavedHint(true)
                            setTimeout(() => setDefaultsSavedHint(false), 2500)
                          }}
                        >
                          {defaultsSavedHint ? "Guardado" : "Guardar como predeterminado"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href="/configuracion?tab=facturacion">Abrir Configuración ARCA</Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setForm((prev) => ({ ...prev, force: true }))}
                      disabled={form.force === true}
                    >
                      Habilitar reintento forzado
                    </Button>
                    {form.force ? <Badge variant="outline">force=true activo</Badge> : null}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Usá reintento forzado solo si la venta ya tuvo facturación previa y operaciones lo confirma.
                  </p>
                </div>
              )}
              <DialogFooter>
                {invoiceModalMode === "view" ? (
                  <Button variant="outline" onClick={() => setIsEmitModalOpen(false)}>
                    Cerrar
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEmitModalOpen(false)} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={requestEmitConfirmation}
                      disabled={isSubmitting || !selectedSale || modalClienteLoading}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Revisar y confirmar emisión
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <FacturacionEmitConfirmDialog
            open={isConfirmEmitOpen}
            onOpenChange={(open) => {
              setIsConfirmEmitOpen(open)
              if (!open && !isEmitModalOpen) setErrorMsg(null)
            }}
            billable={selectedBillable}
            sale={selectedSale}
            cliente={modalCliente}
            clienteLoading={modalClienteLoading}
            form={form}
            lines={confirmLines}
            linesLoading={confirmLinesLoading}
            linesError={confirmLinesError}
            emisorCuitLabel={emisorCuitMostrar}
            isSubmitting={isSubmitting}
            onConfigure={() => setIsEmitModalOpen(true)}
            selectedBillableKey={selectedBillableKey}
            onReceptorCuitChange={(raw: string) =>
              setForm((prev) => applyReceptorCuitToFacturarForm(prev, raw, clienteFiscalSnapshot))
            }
            onPadronApply={(data: ArcaPadronResult) =>
              setForm((prev) => applyPadronToFacturarForm(prev, data))
            }
            onPadronReset={() => {
              if (modalCliente) {
                const fiscal = resolveFacturacionDesdeCliente(modalCliente)
                const cuil = soloDigitos(modalCliente.cuil_cuit)
                setForm((prev) => ({
                  ...prev,
                  condicionIvaReceptor: fiscal.condicionIvaReceptor,
                  tipo: fiscal.tipoComprobante,
                  ...(cuil.length === 11
                    ? { docTipo: 80, docNro: parseInt(cuil, 10) }
                    : { docTipo: 99, docNro: 0 }),
                }))
              } else {
                setForm((prev) => applyReceptorCuitToFacturarForm(prev, "", null))
              }
            }}
            onConfirm={() => void onSubmitFacturar()}
          />

          <Dialog open={creditNoteSale != null} onOpenChange={(open) => !open && setCreditNoteSale(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>¿Fue un error?</DialogTitle>
                <DialogDescription>
                  Si la factura fiscal se emitió por error y no corresponde a una venta real, la vía correcta ante
                  AFIP es una <strong>nota de crédito</strong> por el mismo importe, referenciando el comprobante original.
                </DialogDescription>
              </DialogHeader>

              {creditNoteSale && creditNotePreview ? (
                <div className="space-y-4 text-sm">
                  <div className="rounded-lg border p-3 space-y-2">
                    <div>
                      <span className="text-muted-foreground">Venta: </span>
                      <span className="font-medium">{creditNoteSale.sale_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Importe a anular: </span>
                      <span className="font-medium">{formatCurrency(creditNotePreview.importe)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Factura original: </span>
                      <span className="font-medium">
                        {getTipoComprobanteLabel(creditNotePreview.tipoFactura)}
                        {creditNotePreview.facturaRef ? ` — ${creditNotePreview.facturaRef}` : ""}
                      </span>
                    </div>
                    {creditNotePreview.cae ? (
                      <div>
                        <span className="text-muted-foreground">CAE factura: </span>
                        <span className="font-mono">{creditNotePreview.cae}</span>
                      </div>
                    ) : null}
                    {creditNotePreview.ncLabel ? (
                      <div>
                        <span className="text-muted-foreground">Nota de crédito sugerida: </span>
                        <span className="font-medium">{creditNotePreview.ncLabel}</span>
                      </div>
                    ) : (
                      <Alert
                        variant="warning"
                        title="Tipo de NC no definido"
                        description="No se pudo inferir la nota de crédito desde el tipo de factura. El backend debe mapear tipo factura → tipo NC."
                      />
                    )}
                  </div>

                  {!creditNotePreview.facturaRef ? (
                    <Alert
                      variant="warning"
                      title="Faltan datos del comprobante original"
                      description="Para emitir la NC, el backend debe persistir punto de venta y número AFIP al facturar. Si facturaste en otra sesión, abrí la venta desde este navegador o pedí el dato a soporte."
                    />
                  ) : null}

                  <Alert
                    variant="info"
                    title="Próximo paso: backend"
                    description={
                      <>
                        Pedí al equipo MF API el endpoint{" "}
                        <code className="rounded bg-muted px-1 text-xs">POST /api/sales/:id/nota-credito</code>.
                        Especificación en{" "}
                        <code className="rounded bg-muted px-1 text-xs">docs/nota-credito-arca-backend.md</code>.
                      </>
                    }
                  />
                </div>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setCreditNoteSale(null)}>
                  Cerrar
                </Button>
                <Button disabled title="Disponible cuando MF API implemente POST /api/sales/:id/nota-credito">
                  Emitir nota de crédito
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ERPLayout>
    </Protected>
  )
}
