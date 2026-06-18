"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Package, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  confirmPurchaseSupplierDocument,
  getPurchases,
  getSuppliers,
  parsePurchaseSupplierDocument,
  rematchPurchaseSupplierDocument,
  type MatchedPurchaseDocumentItem,
  type ParsePurchaseDocumentResult,
  type Purchase,
  type Supplier,
} from "@/lib/api"

interface ImportSupplierDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EditableItem extends MatchedPurchaseDocumentItem {
  update_stock: boolean
  update_cost: boolean
  unit_cost_input: string
}

type Step = "upload" | "review" | "confirming"

function matchBadge(status: EditableItem["match_status"]) {
  if (status === "matched") return <Badge className="bg-green-600">Vinculado</Badge>
  if (status === "partial") return <Badge variant="secondary">Parcial</Badge>
  return <Badge variant="destructive">Sin match</Badge>
}

export function ImportSupplierDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSupplierDocumentModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [isParsing, setIsParsing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [parseResult, setParseResult] = useState<ParsePurchaseDocumentResult | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [supplierId, setSupplierId] = useState<string>("")
  const [purchaseId, setPurchaseId] = useState<string>("")
  const [createPurchase, setCreatePurchase] = useState(true)
  const [applyStock, setApplyStock] = useState(true)
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [sourceInvoiceNumber, setSourceInvoiceNumber] = useState("")
  const [insuredValue, setInsuredValue] = useState("")
  const [notes, setNotes] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const reset = useCallback(() => {
    setStep("upload")
    setParseResult(null)
    setItems([])
    setSupplierId("")
    setPurchaseId("")
    setCreatePurchase(true)
    setApplyStock(true)
    setDeliveryNoteNumber("")
    setDeliveryDate("")
    setSourceInvoiceNumber("")
    setInsuredValue("")
    setNotes("")
  }, [])

  useEffect(() => {
    if (!isOpen) return
    getSuppliers({ all: true })
      .then((res) => {
        if (res.success) setSuppliers(res.data.suppliers)
      })
      .catch(() => toast.error("No se pudieron cargar los proveedores"))
  }, [isOpen])

  useEffect(() => {
    if (!supplierId) {
      setPurchases([])
      return
    }
    getPurchases({ supplier_id: parseInt(supplierId, 10), status: "pending", all: true })
      .then((res) => {
        if (res.success) setPurchases(res.data.purchases ?? [])
      })
      .catch(() => setPurchases([]))
  }, [supplierId])

  const handleClose = () => {
    reset()
    onClose()
  }

  const applyParseResult = (result: ParsePurchaseDocumentResult) => {
    setParseResult(result)
    setDeliveryNoteNumber(result.parsed.delivery_note_number ?? "")
    setDeliveryDate(result.parsed.delivery_date ?? new Date().toISOString().slice(0, 10))
    setSourceInvoiceNumber(result.parsed.source_invoice_number ?? "")
    setInsuredValue(result.parsed.insured_value != null ? String(result.parsed.insured_value) : "")
    if (result.suggested_supplier_id) {
      setSupplierId(String(result.suggested_supplier_id))
    }
    if (result.suggested_purchase_id) {
      setPurchaseId(String(result.suggested_purchase_id))
      setCreatePurchase(false)
    }
    setItems(
      result.items.map((item) => ({
        ...item,
        update_stock: !!item.product_id,
        update_cost: !!item.expected_unit_cost,
        unit_cost_input: item.expected_unit_cost != null ? String(item.expected_unit_cost) : "",
      }))
    )
    setStep("review")
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se admiten archivos PDF")
      return
    }
    setIsParsing(true)
    try {
      const response = await parsePurchaseSupplierDocument(file)
      if (response.success) {
        applyParseResult(response.data)
        if (response.data.warnings.length) {
          response.data.warnings.forEach((w) => toast.warning(w))
        } else {
          toast.success("Documento analizado correctamente")
        }
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al analizar el PDF")
    } finally {
      setIsParsing(false)
    }
  }

  const handleSupplierChange = async (value: string) => {
    setSupplierId(value)
    setPurchaseId("")
    if (!parseResult?.file_token) return
    try {
      const res = await rematchPurchaseSupplierDocument(parseResult.file_token, parseInt(value, 10))
      if (res.success) {
        setItems(
          res.data.items.map((item) => ({
            ...item,
            update_stock: !!item.product_id,
            update_cost: !!item.expected_unit_cost,
            unit_cost_input: item.expected_unit_cost != null ? String(item.expected_unit_cost) : "",
          }))
        )
      }
    } catch {
      /* mantener ítems actuales */
    }
  }

  const handleConfirm = async () => {
    if (!parseResult?.file_token) return
    if (!supplierId) {
      toast.error("Seleccione un proveedor")
      return
    }
    if (!deliveryNoteNumber.trim()) {
      toast.error("Ingrese el número de remito")
      return
    }
    if (!deliveryDate) {
      toast.error("Ingrese la fecha del remito")
      return
    }
    if (!createPurchase && !purchaseId) {
      toast.error("Seleccione una orden de compra o habilite crear OC automática")
      return
    }

    setIsConfirming(true)
    setStep("confirming")
    try {
      const response = await confirmPurchaseSupplierDocument({
        file_token: parseResult.file_token,
        supplier_id: parseInt(supplierId, 10),
        purchase_id: purchaseId ? parseInt(purchaseId, 10) : undefined,
        create_purchase_if_missing: createPurchase,
        delivery_note_number: deliveryNoteNumber.trim(),
        delivery_date: deliveryDate,
        source_invoice_number: sourceInvoiceNumber || undefined,
        insured_value: insuredValue ? parseFloat(insuredValue) : undefined,
        notes: notes || undefined,
        apply_stock: applyStock,
        items: items.map((item) => ({
          material_code: item.material_code,
          barcode: item.barcode,
          description: item.description,
          quantity: item.quantity,
          product_id: item.product_id,
          purchase_item_id: item.purchase_item_id,
          unit_cost: item.unit_cost_input ? parseFloat(item.unit_cost_input) : item.expected_unit_cost,
          update_stock: item.update_stock,
          update_cost: item.update_cost,
        })),
      })

      if (response.success) {
        const stockCount = response.data.stock_updates.length
        toast.success(
          `Remito ${response.data.delivery_note_number} registrado` +
            (applyStock ? ` · Stock actualizado en ${stockCount} producto(s)` : "")
        )
        response.data.warnings.forEach((w) => toast.warning(w))
        onSuccess()
        handleClose()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al confirmar")
      setStep("review")
    } finally {
      setIsConfirming(false)
    }
  }

  const matchedCount = items.filter((i) => i.match_status === "matched").length
  const unmatchedCount = items.filter((i) => i.match_status === "unmatched").length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importar documento del proveedor
          </DialogTitle>
          <DialogDescription>
            Suba el remito o factura PDF tal como lo envía el proveedor. El sistema extrae ítems,
            controla costos y puede actualizar stock previa confirmación.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
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
              const file = e.dataTransfer.files?.[0]
              if (file) void processFile(file)
            }}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p>Analizando documento…</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">Arrastre el PDF del proveedor aquí</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Compatible con remitos Invid/Jukebox y formatos similares
                </p>
                <Label htmlFor="supplier-pdf-upload" className="cursor-pointer">
                  <Button asChild variant="outline">
                    <span>Seleccionar archivo</span>
                  </Button>
                  <input
                    id="supplier-pdf-upload"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void processFile(file)
                    }}
                  />
                </Label>
              </>
            )}
          </div>
        )}

        {step !== "upload" && parseResult && (
          <div className="space-y-4">
            {parseResult.duplicate_delivery_note && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <span>Este número de remito ya existe en el sistema. Verifique antes de confirmar.</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Archivo:</span>{" "}
                    {parseResult.original_filename}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Proveedor detectado:</span>{" "}
                    {parseResult.parsed.supplier_name ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Ítems:</span> {items.length} ·{" "}
                    <span className="text-green-600">{matchedCount} vinculados</span>
                    {unmatchedCount > 0 && (
                      <span className="text-red-600"> · {unmatchedCount} sin match</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Datos del remito</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>N° remito</Label>
                    <Input value={deliveryNoteNumber} onChange={(e) => setDeliveryNoteNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha</Label>
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Factura origen</Label>
                    <Input
                      value={sourceInvoiceNumber}
                      onChange={(e) => setSourceInvoiceNumber(e.target.value)}
                      placeholder="0004-00228449"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Valor asegurado</Label>
                    <Input
                      type="number"
                      value={insuredValue}
                      onChange={(e) => setInsuredValue(e.target.value)}
                      placeholder="599555.71"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={supplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orden de compra</Label>
                <Select
                  value={purchaseId || "none"}
                  onValueChange={(v) => setPurchaseId(v === "none" ? "" : v)}
                  disabled={createPurchase}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional si crea OC automática" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin OC previa</SelectItem>
                    {purchases.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.purchase_number} · {p.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 rounded-lg border p-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={createPurchase} onCheckedChange={(v) => setCreatePurchase(!!v)} />
                Crear OC automática si no hay una seleccionada
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={applyStock} onCheckedChange={(v) => setApplyStock(!!v)} />
                Actualizar stock al confirmar
              </label>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cód. material</TableHead>
                    <TableHead>Producto ERP</TableHead>
                    <TableHead>Costo OC</TableHead>
                    <TableHead>Costo nuevo</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={`${item.material_code}-${idx}`}>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-sm" title={item.description}>
                          {item.description}
                        </p>
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground">EAN: {item.barcode}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.material_code}</TableCell>
                      <TableCell>
                        {item.product_name ? (
                          <div>
                            <p className="text-sm font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.product_code} · Stock: {item.current_stock ?? "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin vincular</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.expected_unit_cost != null
                          ? `$${item.expected_unit_cost.toLocaleString("es-AR")}`
                          : "—"}
                        {item.pending_quantity != null && (
                          <p className="text-xs text-muted-foreground">
                            Pend: {item.pending_quantity}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={item.unit_cost_input}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], unit_cost_input: e.target.value }
                            setItems(next)
                          }}
                        />
                        <label className="flex items-center gap-1 mt-1 text-xs">
                          <Checkbox
                            checked={item.update_cost}
                            onCheckedChange={(v) => {
                              const next = [...items]
                              next[idx] = { ...next[idx], update_cost: !!v }
                              setItems(next)
                            }}
                          />
                          Actualizar
                        </label>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={item.update_stock}
                          disabled={!item.product_id || !applyStock}
                          onCheckedChange={(v) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], update_stock: !!v }
                            setItems(next)
                          }}
                        />
                      </TableCell>
                      <TableCell>{matchBadge(item.match_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones sobre la recepción, diferencias, transporte…"
                rows={2}
              />
            </div>

            {parseResult.parsed.transport_company && (
              <p className="text-sm text-muted-foreground">
                Transporte detectado: {parseResult.parsed.transport_company}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isConfirming}>
            Cancelar
          </Button>
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isConfirming}>
                Cambiar archivo
              </Button>
              <Button onClick={handleConfirm} disabled={isConfirming}>
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirmando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar recepción
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
