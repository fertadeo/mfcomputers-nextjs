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
  type MatchedSalesInvoiceItem,
  type ParseSalesInvoiceResult,
} from "@/lib/api"
import { TIPOS_COMPROBANTE_AFIP } from "@/lib/facturacion-comprobantes"

interface ImportClientInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Cliente preseleccionado (p. ej. desde ficha de cliente). */
  defaultClientId?: number
}

interface EditableItem extends MatchedSalesInvoiceItem {
  unit_price_input: string
  quantity_input: string
}

type Step = "upload" | "review" | "confirming"

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
    setItems(
      result.items.map((item) => ({
        ...item,
        unit_price_input: String(item.unit_price ?? 0),
        quantity_input: String(item.quantity ?? 1),
      }))
    )
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
      setItems(
        res.data.items.map((item) => ({
          ...item,
          unit_price_input: String(item.unit_price ?? 0),
          quantity_input: String(item.quantity ?? 1),
        }))
      )
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

    setIsConfirming(true)
    setStep("confirming")
    try {
      const res = await confirmSalesInvoiceDocument({
        file_token: parseResult.file_token,
        client_id: parseInt(clientId, 10),
        punto_venta: parseInt(puntoVenta, 10),
        numero: parseInt(numero, 10),
        comprobante_tipo: parseInt(comprobanteTipo, 10),
        fecha_emision: fechaEmision,
        cae: cae.trim(),
        cae_vto: caeVto || undefined,
        cuit_emisor: cuitEmisor || undefined,
        total_amount: parseFloat(totalAmount) || 0,
        notes: notes || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity_input) || item.quantity,
          unit_price: parseFloat(item.unit_price_input) || item.unit_price || 0,
          product_id: item.product_id,
          product_code: item.product_code,
          iva_rate: item.iva_rate,
        })),
      })
      toast.success(`Factura ${res.data.comprobante_label} registrada (${res.data.sale_number})`)
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
            Suba el PDF de una factura emitida por fuera del sistema o desde el portal ARCA.
            El comprobante quedará registrado como <strong>factura importada</strong>: no podrá emitirse,
            reemitirse ni anularse por API desde el sistema.
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
                <CardTitle className="text-base">Ítems detectados</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-20">Cant.</TableHead>
                      <TableHead className="w-28">P. unit.</TableHead>
                      <TableHead className="w-24">Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
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
                              next[idx] = { ...next[idx], quantity_input: e.target.value }
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit_price_input}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = { ...next[idx], unit_price_input: e.target.value }
                              setItems(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>{matchBadge(item.match_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
