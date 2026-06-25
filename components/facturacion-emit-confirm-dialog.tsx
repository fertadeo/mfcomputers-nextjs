"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronUp, Copy, Loader2 } from "lucide-react"
import { ArcaPadronCuitField } from "@/components/arca-padron-cuit-field"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TipoComprobanteBadge } from "@/components/tipo-comprobante-badge"
import type { Cliente, FacturarSaleRequest, Sale } from "@/lib/api"
import type { BillableRow } from "@/lib/facturacion-billables"
import { labelCondicionIvaReceptorForDisplay } from "@/lib/facturacion-cliente-fiscal"
import { getTipoComprobanteLabel } from "@/lib/facturacion-comprobantes"
import { getArcaPadronDisplayName, type ArcaPadronResult } from "@/lib/arca-padron"
import { formatFacturacionFecha, type FacturacionPreviewLine } from "@/lib/facturacion-preview-lines"
import { computeSaleIvaBreakdown, formatSaleIvaRateLabel } from "@/lib/sale-iva"
import { FacturacionArcaPreviewPanel } from "@/components/facturacion-arca-preview-panel"
import { ClienteInfoCard } from "@/components/cliente-picker"
import { buildArcaInvoicePdfInputFromPreviewLines } from "@/lib/build-arca-invoice-pdf-input"
import { buildFacturarFullPayloadPreview } from "@/lib/facturacion-request-preview"
import {
  applyCondicionVentaToFacturarPayload,
  CONDICION_VENTA_CATALOG,
  CONDICION_VENTA_MAX_LENGTH,
  DEFAULT_CONDICION_VENTA_CODIGO,
  getCondicionVentaByCodigo,
  resolveCondicionVentaEtiqueta,
} from "@/lib/condicion-venta"
import {
  buildVentaDestinatarioSnapshot,
  formatCuitInputDisplay,
  isFacturacionDestinatarioChanged,
  isReceptorCuitInputInvalid,
  receptorCuitInputFromForm,
  requiresPadronForReceptorCuit,
  soloDigitosDoc,
} from "@/lib/facturacion-receptor-doc"
import {
  formatCondicionPadronMismatchHint,
  validateCondicionIvaConPadronSugerencia,
} from "@/lib/facturacion-padron-condicion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { formatSaleMoney, isUsdSale } from "@/lib/pos-usd"
import { SaleCurrencyNotice } from "@/components/sale-currency-notice"
import { FacturacionErrorAlert } from "@/components/facturacion-error-alert"
import type { FacturacionErrorInfo } from "@/lib/facturacion-errors"

function conceptoLabel(concepto?: number): string {
  if (concepto === 2) return "Servicios"
  if (concepto === 3) return "Productos + servicios"
  return "Productos"
}

export interface FacturacionEmitConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  billable: BillableRow | null
  sale: Sale | null
  cliente: Cliente | null
  clienteLoading: boolean
  form: FacturarSaleRequest
  lines: FacturacionPreviewLine[]
  /** Fecha comercial de la venta (defaults.saleDate de la sugerencia). */
  saleDate?: string | null
  /** Fecha del comprobante que enviará el backend (defaults.fechaCbte). */
  fechaCbte?: string | null
  linesLoading: boolean
  linesError: string | null
  /** Factura C con ítems gravados: bloquear emisión. */
  itemIvaError?: string | null
  /** Cliente con CUIT en ERP pero payload a consumidor final. */
  receptorFiscalError?: string | null
  /** Error devuelto al confirmar emisión (visible dentro del modal, no detrás del overlay). */
  emitError?: FacturacionErrorInfo | null
  emitErrorTitle?: string | null
  emitErrorRequestId?: string | null
  /** Body definitivo para POST /sales/:id/facturar (tras buildFacturarPayload). */
  facturarPayload: FacturarSaleRequest
  emisorCuitLabel: string
  isSubmitting: boolean
  onConfigure: () => void
  onReceptorCuitChange: (rawInput: string) => void
  onPadronApply: (data: ArcaPadronResult) => void
  onPadronReset: () => void
  onCondicionVentaCodigoChange: (codigo: string) => void
  onCondicionVentaTextoChange: (texto: string) => void
  onConfirm: (payload: FacturarSaleRequest) => void
  /** Clave de fila seleccionada (reinicia estado al cambiar comprobante). */
  selectedBillableKey?: string | null
}

export function FacturacionEmitConfirmDialog({
  open,
  onOpenChange,
  billable,
  sale,
  cliente,
  clienteLoading,
  form,
  lines,
  saleDate,
  fechaCbte,
  linesLoading,
  linesError,
  itemIvaError = null,
  receptorFiscalError = null,
  emitError = null,
  emitErrorTitle = null,
  emitErrorRequestId = null,
  facturarPayload,
  emisorCuitLabel,
  isSubmitting,
  onConfigure,
  onReceptorCuitChange,
  onPadronApply,
  onPadronReset,
  onCondicionVentaCodigoChange,
  onCondicionVentaTextoChange,
  onConfirm,
  selectedBillableKey = null,
}: FacturacionEmitConfirmDialogProps) {
  const [receptorCuitInput, setReceptorCuitInput] = useState("")
  const [padronDisplayName, setPadronDisplayName] = useState<string | null>(null)
  const [padronVerifiedDigits, setPadronVerifiedDigits] = useState<string | null>(null)
  const [padronCondicionCodigo, setPadronCondicionCodigo] = useState<number | null>(null)
  const [payloadJsonOpen, setPayloadJsonOpen] = useState(false)
  const [payloadCopied, setPayloadCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setReceptorCuitInput(receptorCuitInputFromForm(form, cliente?.cuil_cuit, cliente?.primary_tax_id))
    setPadronDisplayName(null)
    setPadronVerifiedDigits(null)
    setPadronCondicionCodigo(null)
    setPayloadJsonOpen(false)
    setPayloadCopied(false)
  }, [open, billable?.key, selectedBillableKey])

  useEffect(() => {
    if (!open) return
    setReceptorCuitInput(receptorCuitInputFromForm(form, cliente?.cuil_cuit, cliente?.primary_tax_id))
  }, [open, form.docTipo, form.docNro, cliente?.cuil_cuit, cliente?.primary_tax_id, form])

  const ventaDestinatario = buildVentaDestinatarioSnapshot(
    sale?.client_name,
    billable?.clientName,
    cliente?.cuil_cuit,
    cliente?.tax_condition,
    cliente?.primary_tax_id
  )

  const invoiceCurrency = sale?.currency === "USD" ? "USD" : "ARS"
  const saleInUsd = isUsdSale(sale?.currency)
  const formatCurrency = (value: number) =>
    formatSaleMoney(value, invoiceCurrency, { maximumFractionDigits: 2, minimumFractionDigits: 2 })

  const linesSubtotal = lines.reduce((acc, l) => acc + l.subtotal, 0)
  const totalComprobante = sale?.total_amount ?? billable?.totalAmount ?? linesSubtotal
  const ivaBreakdown = computeSaleIvaBreakdown(
    lines.map((line) => ({ subtotal: line.subtotal, iva_rate: line.ivaRate }))
  )
  const hasBackendIvaDetail = lines.some((l) => l.neto != null && l.iva != null)
  const netoFromLines = hasBackendIvaDetail
    ? Math.round(lines.reduce((acc, l) => acc + (l.neto ?? 0), 0) * 100) / 100
    : ivaBreakdown.netoGravado
  const ivaFromLines = hasBackendIvaDetail
    ? Math.round(lines.reduce((acc, l) => acc + (l.iva ?? 0), 0) * 100) / 100
    : ivaBreakdown.ivaTotal
  const cuitInvalid = isReceptorCuitInputInvalid(receptorCuitInput)
  const esConsumidorFinal = form.docTipo === 99 && (form.docNro ?? 0) === 0
  const receptorCuitDigits = esConsumidorFinal ? "" : soloDigitosDoc(receptorCuitInput)

  const destinatarioCambio = isFacturacionDestinatarioChanged(ventaDestinatario, {
    esConsumidorFinal,
    receptorCuitDigits,
    padronDisplayName,
  })

  const comprobanteDestinatarioNombre = esConsumidorFinal
    ? "Consumidor final"
    : padronDisplayName || ventaDestinatario.name

  const comprobanteDestinatarioCuit = esConsumidorFinal
    ? null
    : receptorCuitDigits.length === 11
      ? formatCuitInputDisplay(receptorCuitDigits)
      : null

  const needsPadron = requiresPadronForReceptorCuit(
    ventaDestinatario.cuitDigits,
    receptorCuitDigits,
    esConsumidorFinal
  )
  const padronPending = needsPadron && padronVerifiedDigits !== receptorCuitDigits
  const condicionPadronValidation = useMemo(() => {
    if (esConsumidorFinal || padronPending || padronCondicionCodigo == null) return null
    return validateCondicionIvaConPadronSugerencia(
      form.condicionIvaReceptor ?? 5,
      padronCondicionCodigo
    )
  }, [esConsumidorFinal, padronPending, padronCondicionCodigo, form.condicionIvaReceptor])
  const condicionPadronError = formatCondicionPadronMismatchHint(condicionPadronValidation ?? {
    checked: false,
    coincide: true,
    condicionEnviada: form.condicionIvaReceptor ?? 5,
  })

  const facturarSaleId = useMemo(() => {
    if (!billable || !sale) return null
    if (billable.kind === "repair_order" && billable.linkedSaleId) return billable.linkedSaleId
    return sale.id
  }, [billable, sale])

  const condicionVentaCodigo = form.condicionVentaCodigo ?? DEFAULT_CONDICION_VENTA_CODIGO
  const condicionVentaItem = getCondicionVentaByCodigo(condicionVentaCodigo)
  const condicionVentaEtiqueta = resolveCondicionVentaEtiqueta(
    condicionVentaCodigo,
    form.condicionVentaTexto
  )
  const esOtroCondicionVenta = condicionVentaCodigo === "OTRO"
  const condicionVentaOtroInvalido =
    esOtroCondicionVenta && !(form.condicionVentaTexto ?? "").trim()

  const payloadParaEmision = useMemo(() => {
    const domicilio = [cliente?.address, cliente?.city].filter(Boolean).join(", ") || null
    return applyCondicionVentaToFacturarPayload(facturarPayload, {
      fechaComprobante: fechaCbte ?? saleDate ?? sale?.sale_date,
      receptorRazonSocial: comprobanteDestinatarioNombre,
      receptorDomicilio: domicilio,
    })
  }, [
    facturarPayload,
    fechaCbte,
    saleDate,
    sale?.sale_date,
    comprobanteDestinatarioNombre,
    cliente?.address,
    cliente?.city,
  ])

  const facturarFullPayloadPreview = useMemo(() => {
    if (facturarSaleId == null || !sale) return null

    const docTipo = payloadParaEmision.docTipo ?? 99
    const docNro = payloadParaEmision.docNro ?? 0
    const condicion = payloadParaEmision.condicionIvaReceptor ?? 5

    return buildFacturarFullPayloadPreview({
      saleId: facturarSaleId,
      saleNumber: sale.sale_number,
      clientId: sale.client_id,
      facturarPayload: payloadParaEmision,
      lines,
      saleDate: saleDate ?? sale.sale_date,
      fechaCbte,
      totalAmount: totalComprobante,
      receptor: {
        razonSocial: comprobanteDestinatarioNombre,
        docTipo,
        docNro,
        condicionIvaReceptor: condicion,
        condicionIvaLabel: labelCondicionIvaReceptorForDisplay(condicion, cliente),
        taxConditionEnErp: cliente?.tax_condition ?? null,
        domicilio: [cliente?.address, cliente?.city].filter(Boolean).join(", ") || null,
      },
    })
  }, [
    facturarSaleId,
    sale,
    payloadParaEmision,
    lines,
    saleDate,
    fechaCbte,
    totalComprobante,
    comprobanteDestinatarioNombre,
    cliente,
  ])

  const arcaInvoicePreview = useMemo(() => {
    if (lines.length === 0) return null
    return buildArcaInvoicePdfInputFromPreviewLines({
      facturarPayload: payloadParaEmision,
      lines,
      receptorRazonSocial: comprobanteDestinatarioNombre,
      cliente,
      fechaEmision: fechaCbte ?? saleDate ?? sale?.sale_date,
      totalAmount: totalComprobante,
      saleCurrency: sale?.currency,
      exchangeRate: sale?.exchange_rate,
    })
  }, [
    payloadParaEmision,
    lines,
    comprobanteDestinatarioNombre,
    cliente,
    fechaCbte,
    saleDate,
    sale?.sale_date,
    totalComprobante,
    sale?.currency,
    sale?.exchange_rate,
  ])

  const facturarRequestJson = facturarFullPayloadPreview
    ? JSON.stringify(facturarFullPayloadPreview, null, 2)
    : ""

  const copyPayloadJson = async () => {
    if (!facturarRequestJson) return
    try {
      await navigator.clipboard.writeText(facturarRequestJson)
      setPayloadCopied(true)
      window.setTimeout(() => setPayloadCopied(false), 2000)
    } catch {
      setPayloadCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {saleInUsd ? "Confirmar factura en dólares (DOL)" : "Confirmar emisión del comprobante"}
          </DialogTitle>
          <DialogDescription>
            {saleInUsd
              ? "Esta venta se cobró en USD. El comprobante ARCA se emitirá en moneda dólar con el tipo de cambio guardado al momento del cobro."
              : "Revisá el detalle del comprobante antes de enviarlo al facturador ARCA. La emisión no se puede deshacer desde esta pantalla."}
          </DialogDescription>
        </DialogHeader>

        {emitError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50/90 px-6 py-3 dark:border-red-900 dark:bg-red-950/40">
            <FacturacionErrorAlert
              info={emitError}
              title={emitErrorTitle ?? "No se pudo emitir el comprobante"}
              requestId={emitErrorRequestId}
              compact
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!sale || !billable ? (
            <Alert variant="warning" title="Sin comprobante" description="Seleccioná una venta u orden de reparación." />
          ) : (
            <>
              {saleInUsd ? (
                <SaleCurrencyNotice
                  variant="facturacion"
                  currency={sale?.currency}
                  exchangeRate={sale?.exchange_rate}
                  totalAmount={totalComprobante}
                />
              ) : null}

              {clienteLoading ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Cargando datos del cliente…
                </div>
              ) : cliente ? (
                <ClienteInfoCard cliente={cliente} compact />
              ) : null}

              <div className="rounded-lg border p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-base">{billable.reference}</span>
                  {billable.kind === "repair_order" ? (
                    <Badge variant="outline">
                      Reparación{billable.repairStatusLabel ? ` · ${billable.repairStatusLabel}` : ""}
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Cliente en venta (ERP): </span>
                    <span className="font-medium">{ventaDestinatario.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de venta: </span>
                    <span>{formatFacturacionFecha(saleDate ?? sale?.sale_date ?? billable.date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha del comprobante: </span>
                    <span className="font-medium">
                      {fechaCbte ? formatFacturacionFecha(fechaCbte) : "—"}
                    </span>
                  </div>
                  {fechaCbte &&
                  saleDate &&
                  fechaCbte.slice(0, 10) !== saleDate.slice(0, 10) ? (
                    <p className="text-muted-foreground text-xs sm:col-span-2">
                      La fecha del comprobante difiere de la venta porque ARCA limita el rango de fechas
                      permitidas; el backend usa la fecha de hoy para no rechazar la emisión.
                    </p>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground">CUIT emisor: </span>
                    <span className="font-mono text-xs">{emisorCuitLabel}</span>
                  </div>
                  {ventaDestinatario.cuitFormatted ? (
                    <div>
                      <span className="text-muted-foreground">CUIT en venta (ERP): </span>
                      <span className="font-mono text-xs">{ventaDestinatario.cuitFormatted}</span>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground">Condición fiscal (ERP): </span>
                    <span>{ventaDestinatario.condicionLabel}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <span className="text-muted-foreground">Comprobante a emitir: </span>
                    <TipoComprobanteBadge tipo={form.tipo} />
                    <span className="text-sm">{getTipoComprobanteLabel(form.tipo)}</span>
                    <span className="text-muted-foreground text-xs">
                      · IVA receptor {form.condicionIvaReceptor} (
                      {labelCondicionIvaReceptorForDisplay(form.condicionIvaReceptor ?? 5, cliente)})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Concepto: </span>
                    <span>{conceptoLabel(form.concepto)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Documento AFIP: </span>
                    <span className="font-mono text-xs">
                      {esConsumidorFinal
                        ? "tipo 99 · sin número (consumidor final)"
                        : `tipo ${form.docTipo ?? "—"} · ${form.docNro ?? 0}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Destinatario del comprobante ARCA</p>
                  <p className="text-muted-foreground text-xs">
                    Podés facturar al cliente de la venta u otro CUIT. Si cambiás el CUIT, consultá ARCA (padrón) antes
                    de confirmar. Dejá el campo vacío para consumidor final.
                  </p>
                </div>

                {destinatarioCambio ? (
                  <Alert
                    variant="warning"
                    title="Vas a cambiar el destinatario del comprobante"
                    description="El comprobante fiscal se emitirá a otro contribuyente distinto del cliente registrado en la venta. Verificá nombre y CUIT antes de confirmar."
                  />
                ) : (
                  <Alert
                    variant="info"
                    title="Mismo destinatario que la venta"
                    description="Si no modificás el CUIT, el comprobante se emitirá al cliente de la venta."
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cliente en la venta
                    </p>
                    <p className="font-medium leading-snug">{ventaDestinatario.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {ventaDestinatario.cuitFormatted ?? "Sin CUIT en ERP"}
                    </p>
                    <p className="text-xs text-muted-foreground">{ventaDestinatario.condicionLabel}</p>
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-amber-600">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                  <div
                    className={`rounded-lg border p-3 space-y-1.5 ${
                      destinatarioCambio
                        ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-emerald-500/30 bg-emerald-500/5"
                    }`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Se facturará a
                    </p>
                    <p className="font-semibold leading-snug text-base">{comprobanteDestinatarioNombre}</p>
                    <p className="text-xs font-mono">
                      {comprobanteDestinatarioCuit ?? "Sin CUIT (consumidor final)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelCondicionIvaReceptorForDisplay(form.condicionIvaReceptor ?? 5, cliente)} ·{" "}
                      {getTipoComprobanteLabel(form.tipo)}
                    </p>
                    {padronDisplayName ? (
                      <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
                        Verificado en ARCA
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <ArcaPadronCuitField
                  entityType="client"
                  inputId="confirm-receptor-cuit"
                  label="CUIT / CUIL del receptor (consulta padrón ARCA)"
                  cuitValue={receptorCuitInput}
                  disabled={isSubmitting || clienteLoading}
                  onCuitChange={(formatted) => {
                    const d = soloDigitosDoc(formatted)
                    const prevDigits = soloDigitosDoc(receptorCuitInput)
                    setReceptorCuitInput(formatted)
                    onReceptorCuitChange(formatted)
                    // Tras consulta ARCA el campo se reformatea con los mismos dígitos; no limpiar verificación.
                    if (d.length > 0 && d === prevDigits) return
                    if (d !== padronVerifiedDigits) {
                      setPadronVerifiedDigits(null)
                      setPadronDisplayName(null)
                      setPadronCondicionCodigo(null)
                    }
                  }}
                  onApplyPadron={(data) => {
                    onPadronApply(data)
                    const digits = soloDigitosDoc(data.cuit)
                    setPadronVerifiedDigits(digits)
                    setPadronDisplayName(getArcaPadronDisplayName(data) || null)
                    setPadronCondicionCodigo(
                      data.condicionIvaCodigo != null && data.condicionIvaCodigo > 0
                        ? data.condicionIvaCodigo
                        : null
                    )
                  }}
                  onPadronReset={() => {
                    onPadronReset()
                    setPadronVerifiedDigits(null)
                    setPadronDisplayName(null)
                    setPadronCondicionCodigo(null)
                  }}
                />

                {clienteLoading ? (
                  <p className="text-muted-foreground text-xs">Cargando datos del cliente de la venta…</p>
                ) : null}
                {cuitInvalid ? (
                  <p className="text-destructive text-xs">El CUIT debe tener 11 dígitos o dejá el campo vacío.</p>
                ) : null}
                {padronPending ? (
                  <Alert
                    variant="warning"
                    title="Consultá ARCA para validar el CUIT"
                    description="Con CUIT/CUIL es obligatorio consultar el padrón ARCA antes de emitir. Usá «Buscar en ARCA» o esperá la consulta automática."
                  />
                ) : null}
                {condicionPadronError ? (
                  <Alert
                    variant="error"
                    title="Condición IVA distinta al padrón ARCA"
                    description={condicionPadronError}
                  />
                ) : null}
                {esConsumidorFinal ? (
                  <Badge variant="secondary">Consumidor final — sin documento en AFIP</Badge>
                ) : null}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Condición de venta</h3>
                  <p className="text-muted-foreground text-xs">
                    Dato comercial para el PDF del comprobante. No afecta el CAE ni WSFE, salvo el vencimiento de pago
                    cuando el concepto es servicios o mixto.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-condicion-venta">Forma de pago / plazo</Label>
                    <Select
                      value={condicionVentaCodigo}
                      onValueChange={onCondicionVentaCodigoChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="confirm-condicion-venta">
                        <SelectValue placeholder="Seleccioná condición de venta" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDICION_VENTA_CATALOG.map((item) => (
                          <SelectItem key={item.codigo} value={item.codigo}>
                            {item.etiquetaPdf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Texto en el PDF</Label>
                    <p className="text-sm font-medium leading-snug min-h-[2.5rem] rounded-md border bg-muted/30 px-3 py-2">
                      {condicionVentaEtiqueta}
                    </p>
                  </div>
                </div>
                {esOtroCondicionVenta ? (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-condicion-venta-otro">Texto libre (máx. {CONDICION_VENTA_MAX_LENGTH})</Label>
                    <Input
                      id="confirm-condicion-venta-otro"
                      value={form.condicionVentaTexto ?? ""}
                      maxLength={CONDICION_VENTA_MAX_LENGTH}
                      disabled={isSubmitting}
                      placeholder="Ej. Pago contra entrega — 50% anticipo"
                      onChange={(e) => onCondicionVentaTextoChange(e.target.value)}
                    />
                  </div>
                ) : null}
                {(form.concepto === 2 || form.concepto === 3) &&
                condicionVentaItem?.diasPlazo != null &&
                payloadParaEmision.fechaVencimientoPago ? (
                  <p className="text-muted-foreground text-xs">
                    Vencimiento de pago (servicios):{" "}
                    <span className="font-medium text-foreground">
                      {formatFacturacionFecha(payloadParaEmision.fechaVencimientoPago)}
                    </span>
                  </p>
                ) : null}
                {condicionVentaOtroInvalido ? (
                  <p className="text-destructive text-xs">Ingresá el texto de la condición de venta.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Detalle del comprobante</h3>
                {linesLoading ? (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando ítems…
                  </div>
                ) : linesError ? (
                  <Alert variant="warning" title="No se pudieron cargar los ítems" description={linesError} />
                ) : lines.length === 0 ? (
                  <Alert
                    variant="warning"
                    title="Sin líneas de detalle"
                    description="No hay ítems cargados para este comprobante. Verificá la venta o la orden de reparación antes de emitir."
                  />
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right w-20">Cant.</TableHead>
                          <TableHead className="text-right">P. unit.</TableHead>
                          <TableHead className="text-right w-24">IVA</TableHead>
                          {hasBackendIvaDetail ? (
                            <>
                              <TableHead className="text-right">Neto</TableHead>
                              <TableHead className="text-right">IVA $</TableHead>
                            </>
                          ) : null}
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, idx) => (
                          <TableRow key={`${line.description}-${idx}`}>
                            <TableCell className="max-w-[280px]">
                              <span className="line-clamp-2">{line.description}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums whitespace-nowrap">
                              {formatCurrency(line.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums whitespace-nowrap text-xs">
                              {formatSaleIvaRateLabel(line.ivaRate)}
                            </TableCell>
                            {hasBackendIvaDetail ? (
                              <>
                                <TableCell className="text-right tabular-nums whitespace-nowrap text-xs">
                                  {formatCurrency(line.neto ?? 0)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums whitespace-nowrap text-xs">
                                  {formatCurrency(line.iva ?? 0)}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                              {formatCurrency(line.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Neto gravado: {formatCurrency(netoFromLines)}</p>
                  <p>IVA discriminado: {formatCurrency(ivaFromLines)}</p>
                  {ivaBreakdown.iva21 > 0 ? (
                    <p>IVA 21% contenido: {formatCurrency(ivaBreakdown.iva21)}</p>
                  ) : null}
                  {ivaBreakdown.iva105 > 0 ? (
                    <p>IVA 10,5% contenido: {formatCurrency(ivaBreakdown.iva105)}</p>
                  ) : null}
                  {ivaBreakdown.ivaExento > 0 ? (
                    <p>Importe exento / 0%: {formatCurrency(ivaBreakdown.ivaExento)}</p>
                  ) : null}
                  {lines.length > 0 && Math.abs(linesSubtotal - totalComprobante) > 0.01 ? (
                    <p>
                      Suma de líneas: {formatCurrency(linesSubtotal)} · Total comprobante:{" "}
                      {formatCurrency(totalComprobante)}
                    </p>
                  ) : (
                    <p>Total a facturar en ARCA (precios con IVA incluido)</p>
                  )}
                </div>
                {invoiceCurrency === "USD" && sale?.exchange_rate ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">
                    Importes en USD · moneda WSFE DOL · TC {Number(sale.exchange_rate).toLocaleString("es-AR")} ARS/USD
                  </p>
                ) : null}
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalComprobante)}</p>
              </div>

              <FacturacionArcaPreviewPanel
                data={linesLoading ? null : arcaInvoicePreview}
                loading={linesLoading}
                error={linesError}
                defaultOpen
              />

              <div className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => setPayloadJsonOpen((prev) => !prev)}
                  aria-expanded={payloadJsonOpen}
                >
                  <span>JSON completo del comprobante</span>
                  {payloadJsonOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {payloadJsonOpen ? (
                  <div className="border-t px-4 pb-4 pt-3 space-y-2">
                    <p className="text-muted-foreground text-xs">
                      Incluye el POST al backend (<code className="text-[11px]">httpRequest</code>), receptor (razón
                      social, CUIT, condición IVA), ítems con alícuotas, neto/IVA y totales. Los productos no van en el
                      body del POST: el servidor los lee de la venta (<code className="text-[11px]">sale_items</code>).
                      No incluye cabeceras de autenticación.
                    </p>
                    <div className="relative">
                      <pre className="max-h-[min(28rem,50vh)] overflow-auto rounded-md bg-muted/60 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                        {facturarRequestJson}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 h-8 bg-background/90"
                        onClick={() => void copyPayloadJson()}
                        disabled={!facturarRequestJson}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        {payloadCopied ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {receptorFiscalError ? (
                <Alert variant="error" title="Receptor fiscal incorrecto" description={receptorFiscalError} />
              ) : null}

              {itemIvaError ? (
                <Alert variant="error" title="No se puede emitir" description={itemIvaError} />
              ) : null}

              {form.force ? (
                <Alert
                  variant="warning"
                  title="Reintento forzado activo"
                  description="Se enviará force=true al facturador. Usalo solo si operaciones confirmó que corresponde reemitir."
                />
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onConfigure} disabled={isSubmitting}>
            Configuración fiscal
          </Button>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(payloadParaEmision)}
              disabled={
                isSubmitting ||
                !sale ||
                clienteLoading ||
                linesLoading ||
                lines.length === 0 ||
                cuitInvalid ||
                padronPending ||
                !!condicionPadronError ||
                condicionVentaOtroInvalido ||
                !!itemIvaError ||
                !!receptorFiscalError
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Emitiendo…
                </>
              ) : (
                "Confirmar y emitir en ARCA"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
