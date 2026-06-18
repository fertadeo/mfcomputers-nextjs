"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  confirmSalesInvoiceDocument,
  getClientes,
  parseSalesInvoiceDocument,
  rematchSalesInvoiceDocument,
  type Cliente,
  type LinkableSaleSummary,
  type MatchedSalesInvoiceItem,
  type ParseSalesInvoiceResult,
} from "@/lib/api"
import { LINKED_POS_SALE_HINT } from "@/lib/sale-import"
import { TIPOS_COMPROBANTE_AFIP } from "@/lib/facturacion-comprobantes"
import { formatSaleIvaRateLabel, normalizeSaleIvaRate } from "@/lib/sale-iva"

interface ImportClientInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Cliente preseleccionado (p. ej. desde ficha de cliente). */
  defaultClientId?: number
}

interface EditableItem extends MatchedSalesInvoiceItem {
  unit_price_net_input: string
  bonif_percent_input: string
  quantity_input: string
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function recalcItemAmounts(item: EditableItem): EditableItem {
  const quantity = parseFloat(item.quantity_input.replace(",", ".")) || item.quantity || 1
  const unitNet = parseFloat(item.unit_price_net_input.replace(",", ".")) || item.unit_price_net || 0
  const bonif = parseFloat(item.bonif_percent_input.replace(",", ".")) || item.bonif_percent || 0
  const rate = normalizeSaleIvaRate(item.iva_rate ?? 21)
  const subtotalNet = round2(quantity * unitNet * (1 - bonif / 100))
  const subtotalGross = rate === 0 ? subtotalNet : round2(subtotalNet * (1 + rate / 100))
  const unitGross = quantity > 0 ? round2(subtotalGross / quantity) : subtotalGross

  return {
    ...item,
    quantity,
    unit_price_net: unitNet,
    bonif_percent: bonif,
    subtotal_net: subtotalNet,
    subtotal_gross: subtotalGross,
    subtotal: subtotalGross,
    iva_rate: rate,
    unit_price: unitGross,
  }
}

function toEditableItem(item: MatchedSalesInvoiceItem): EditableItem {
  const base: EditableItem = {
    ...item,
    unit_price_net_input: String(item.unit_price_net ?? item.unit_price ?? 0),
    bonif_percent_input: String(item.bonif_percent ?? 0),
    quantity_input: String(item.quantity ?? 1),
  }
  return recalcItemAmounts(base)
}

type Step = "upload" | "review" | "confirming"

type RegistrationMode = "standalone" | "link"

function formatSaleDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-AR")
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function matchBadge(status: EditableItem["match_status"]) {
  if (status === "matched") return <Badge className="bg-green-600">Catálogo</Badge>
  if (status === "partial") return <Badge variant="secondary">Parcial</Badge>
  return <Badge variant="outline">Manual</Badge>
}

export function ImportClientInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClientId,
}: ImportClientInvoiceModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [isParsing, setIsParsing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [parseResult, setParseResult] = useState<ParseSalesInvoiceResult | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientId, setClientId] = useState<string>("")
  const [puntoVenta, setPuntoVenta] = useState("")
  const [numero, setNumero] = useState("")
  const [comprobanteTipo, setComprobanteTipo] = useState("6")
  const [fechaEmision, setFechaEmision] = useState("")
  const [cae, setCae] = useState("")
  const [caeVto, setCaeVto] = useState("")
  const [cuitEmisor, setCuitEmisor] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("standalone")
  const [linkableSales, setLinkableSales] = useState<LinkableSaleSummary[]>([])
  const [linkSaleId, setLinkSaleId] = useState<string>("")

  const reset = useCallback(() => {
    setStep("upload")
    setParseResult(null)
    setItems([])
    setClientId(defaultClientId ? String(defaultClientId) : "")
    setPuntoVenta("")
    setNumero("")
    setComprobanteTipo("6")
    setFechaEmision("")
    setCae("")
    setCaeVto("")
    setCuitEmisor("")
    setTotalAmount("")
    setNotes("")
    setRegistrationMode("standalone")
    setLinkableSales([])
    setLinkSaleId("")
  }, [defaultClientId])

  useEffect(() => {
    if (!isOpen) return
    reset()
    getClientes(1, 200, undefined, "active")
      .then((res) => {
        setClientes(res.clients ?? [])
      })
      .catch(() => toast.error("No se pudieron cargar los clientes"))
  }, [isOpen, reset])

  const applyParseResult = (result: ParseSalesInvoiceResult) => {
    setParseResult(result)
    setPuntoVenta(result.parsed.punto_venta != null ? String(result.parsed.punto_venta) : "")
    setNumero(result.parsed.numero != null ? String(result.parsed.numero) : "")
    setComprobanteTipo(String(result.parsed.comprobante_tipo ?? 6))
    setFechaEmision(result.parsed.fecha_emision ?? "")
    setCae(result.parsed.cae ?? "")
    setCaeVto(result.parsed.cae_vto ?? "")
    setCuitEmisor(result.parsed.cuit_emisor ?? "")
    setTotalAmount(
      result.parsed.total_amount != null ? String(result.parsed.total_amount) : ""
    )
    if (result.suggested_client_id) {
      setClientId(String(result.suggested_client_id))
    }
    setItems(result.items.map((item) => toEditableItem(item)))
    setLinkableSales(result.linkable_sales ?? [])
    if (result.suggested_link_sale_id && (result.linkable_sales?.length ?? 0) > 0) {
      setRegistrationMode("link")
      setLinkSaleId(String(result.suggested_link_sale_id))
    } else {
      setRegistrationMode("standalone")
      setLinkSaleId("")
    }
    setStep("review")
  }

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se permiten archivos PDF")
      return
    }
    setIsParsing(true)
    try {
      const res = await parseSalesInvoiceDocument(
        file,
        defaultClientId ?? (clientId ? parseInt(clientId, 10) : undefined)
      )
      if (res.data.warnings?.length) {
        res.data.warnings.forEach((w) => toast.warning(w))
      }
      applyParseResult(res.data)
      toast.success("Factura analizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al analizar el PDF")
    } finally {
      setIsParsing(false)
    }
  }

  const handleClientChange = async (value: string) => {
    setClientId(value)
    if (!parseResult?.file_token || !value) return
    try {
      const res = await rematchSalesInvoiceDocument(parseResult.file_token, parseInt(value, 10))
      setItems(res.data.items.map((item) => toEditableItem(item)))
      setLinkableSales(res.data.linkable_sales ?? [])
      if (res.data.suggested_link_sale_id) {
        setLinkSaleId(String(res.data.suggested_link_sale_id))
      } else {
        setLinkSaleId("")
      }
    } catch {
      /* opcional */
    }
  }

  const handleConfirm = async () => {
    if (!parseResult?.file_token) return
    if (!clientId) {
      toast.error("Seleccione un cliente")
      return
    }
    if (!cae.trim() || cae.trim().length !== 14) {
      toast.error("El CAE debe tener 14 dígitos")
      return
    }
    if (!puntoVenta || !numero || !fechaEmision) {
      toast.error("Complete punto de venta, número y fecha de emisión")
      return
    }
    if (registrationMode === "link" && !linkSaleId) {
      toast.error("Seleccione la venta POS a vincular")
      return
    }
    if (registrationMode === "standalone" && items.length === 0) {
      toast.error("Agregue al menos un ítem o vincule una venta POS existente")
      return
    }

    setIsConfirming(true)
    setStep("confirming")
    try {
      const res = await confirmSalesInvoiceDocument({
        file_token: parseResult.file_token,
        client_id: parseInt(clientId, 10),
        link_sale_id: registrationMode === "link" ? parseInt(linkSaleId, 10) : undefined,
        punto_venta: parseInt(puntoVenta, 10),
        numero: parseInt(numero, 10),
        comprobante_tipo: parseInt(comprobanteTipo, 10),
        fecha_emision: fechaEmision,
        cae: cae.trim(),
        cae_vto: caeVto || undefined,
        cuit_emisor: cuitEmisor || undefined,
        total_amount: parseFloat(totalAmount) || 0,
        notes: notes || undefined,
        items:
          registrationMode === "link"
            ? []
            : items.map((item) => {
                const calc = recalcItemAmounts(item)
                return {
                  description: calc.description,
                  quantity: calc.quantity,
                  unit_price: calc.unit_price ?? 0,
                  product_id: calc.product_id,
                  product_code: calc.product_code,
                  iva_rate: calc.iva_rate,
                }
              }),
      })
      toast.success(
        res.data.linked_to_pos_sale
          ? `Factura ${res.data.comprobante_label} vinculada a venta ${res.data.sale_number}`
          : `Factura ${res.data.comprobante_label} registrada (${res.data.sale_number})`
      )
      onSuccess()
      onClose()
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al confirmar")
      setStep("review")
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importar factura ARCA (PDF)
          </DialogTitle>
          <DialogDescription>
            Suba el PDF de una factura emitida fuera del sistema. Podés registrarla como venta importada
            o <strong>vincularla a una venta POS</strong> existente del cliente.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) void handleFile(file)
            }}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analizando PDF…</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Arrastre el PDF de la factura o selecciónelo
                </p>
                <Label htmlFor="sales-invoice-pdf" className="cursor-pointer">
                  <Button asChild variant="secondary">
                    <span>Seleccionar archivo</span>
                  </Button>
                  <input
                    id="sales-invoice-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFile(file)
                    }}
                  />
                </Label>
              </>
            )}
          </div>
        )}

        {step === "review" && parseResult && (
          <div className="space-y-4">
            {parseResult.duplicate_invoice && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <span>
                  Ya existe una factura con el mismo PV y número en el sistema. Revise antes de
                  confirmar.
                </span>
              </div>
            )}

            {parseResult.warnings.map((w) => (
              <div
                key={w}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 p-2 text-xs text-amber-900 dark:text-amber-100"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Datos fiscales</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Cliente</Label>
                  <Select value={clientId} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} {c.cuil_cuit ? `(${c.cuil_cuit})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Modo de registro</Label>
                  <Select
                    value={registrationMode}
                    onValueChange={(v) => {
                      const mode = v as RegistrationMode
                      setRegistrationMode(mode)
                      if (mode === "standalone") setLinkSaleId("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">Nueva venta importada (solo registro fiscal)</SelectItem>
                      <SelectItem value="link" disabled={linkableSales.length === 0}>
                        Vincular a venta POS existente
                        {linkableSales.length === 0 ? " (sin ventas pendientes)" : ""}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {registrationMode === "link" ? (
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Venta POS a vincular</Label>
                    <Select value={linkSaleId} onValueChange={setLinkSaleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar venta" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkableSales.map((sale) => (
                          <SelectItem key={sale.id} value={String(sale.id)}>
                            {sale.sale_number} · {formatSaleDate(sale.sale_date)} · $
                            {formatMoney(sale.total_amount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{LINKED_POS_SALE_HINT}</p>
                  </div>
                ) : null}
                <div>
                  <Label>Tipo comprobante</Label>
                  <Select value={comprobanteTipo} onValueChange={setComprobanteTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_COMPROBANTE_AFIP.filter((t) =>
                        [1, 6, 11].includes(t.value)
                      ).map((t) => (
                        <SelectItem key={t.value} value={String(t.value)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Punto de venta</Label>
                  <Input value={puntoVenta} onChange={(e) => setPuntoVenta(e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha emisión</Label>
                  <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
                </div>
                <div>
                  <Label>CAE (14 dígitos)</Label>
                  <Input value={cae} onChange={(e) => setCae(e.target.value.replace(/\D/g, "").slice(0, 14))} />
                </div>
                <div>
                  <Label>Vto. CAE</Label>
                  <Input type="date" value={caeVto} onChange={(e) => setCaeVto(e.target.value)} />
                </div>
                <div>
                  <Label>CUIT emisor</Label>
                  <Input value={cuitEmisor} onChange={(e) => setCuitEmisor(e.target.value)} />
                </div>
                <div>
                  <Label>Importe total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional: observaciones sobre la importación"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {registrationMode === "link" ? "Ítems del PDF (referencia)" : "Ítems detectados"}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {registrationMode === "link" ? (
                  <p className="text-sm text-muted-foreground mb-3">
                    Al vincular, se conservan los ítems de la venta POS. Los del PDF son solo referencia.
                  </p>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-16">Cant.</TableHead>
                      <TableHead className="w-28 text-right">P. unit. neto</TableHead>
                      <TableHead className="w-20 text-right">% Bonif</TableHead>
                      <TableHead className="w-28 text-right">Subtotal neto</TableHead>
                      <TableHead className="w-20 text-right">IVA</TableHead>
                      <TableHead className="w-28 text-right">Subtotal c/IVA</TableHead>
                      <TableHead className="w-24">Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const row = recalcItemAmounts(item)
                      return (
                      <TableRow key={`${item.line_number}-${idx}`}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = { ...next[idx], description: e.target.value }
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.quantity_input}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = recalcItemAmounts({
                                ...next[idx],
                                quantity_input: e.target.value,
                              })
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            value={item.unit_price_net_input}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = recalcItemAmounts({
                                ...next[idx],
                                unit_price_net_input: e.target.value,
                              })
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            value={item.bonif_percent_input}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = recalcItemAmounts({
                                ...next[idx],
                                bonif_percent_input: e.target.value,
                              })
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          ${formatMoney(row.subtotal_net ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatSaleIvaRateLabel(normalizeSaleIvaRate(row.iva_rate))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          ${formatMoney(row.subtotal_gross ?? row.subtotal ?? 0)}
                        </TableCell>
                        <TableCell>{matchBadge(item.match_status)}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
                {items.length > 0 ? (
                  <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Suma líneas c/IVA:{" "}
                      <strong className="text-foreground tabular-nums">
                        ${formatMoney(
                          items.reduce(
                            (sum, item) =>
                              sum + (recalcItemAmounts(item).subtotal_gross ?? 0),
                            0
                          )
                        )}
                      </strong>
                    </span>
                    {totalAmount ? (
                      <span>
                        Total PDF:{" "}
                        <strong className="text-foreground tabular-nums">
                          ${formatMoney(parseFloat(totalAmount) || 0)}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {step === "confirming" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Registrando factura…</p>
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isConfirming}>
                Volver
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={isConfirming}>
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmar importación
              </Button>
            </>
          )}
          {step === "upload" && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
