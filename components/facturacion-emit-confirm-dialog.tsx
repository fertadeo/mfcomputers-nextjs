"use client"

import { Loader2 } from "lucide-react"
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
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import type { BillableRow } from "@/lib/facturacion-billables"
import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { getTipoComprobanteLabel } from "@/lib/facturacion-comprobantes"
import type { FacturacionPreviewLine } from "@/lib/facturacion-preview-lines"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(
    value
  )

function formatCuitMostrar(raw?: string | null): string {
  const d = (raw ?? "").replace(/\D/g, "")
  if (d.length !== 11) return raw?.trim() || "—"
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

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
  linesLoading: boolean
  linesError: string | null
  emisorCuitLabel: string
  isSubmitting: boolean
  onConfigure: () => void
  onConfirm: () => void
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
  linesLoading,
  linesError,
  emisorCuitLabel,
  isSubmitting,
  onConfigure,
  onConfirm,
}: FacturacionEmitConfirmDialogProps) {
  const linesSubtotal = lines.reduce((acc, l) => acc + l.subtotal, 0)
  const totalComprobante = sale?.total_amount ?? billable?.totalAmount ?? linesSubtotal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Confirmar emisión del comprobante</DialogTitle>
          <DialogDescription>
            Revisá el detalle del comprobante antes de enviarlo al facturador ARCA. La emisión no se puede deshacer
            desde esta pantalla.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!sale || !billable ? (
            <Alert variant="warning" title="Sin comprobante" description="Seleccioná una venta u orden de reparación." />
          ) : (
            <>
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
                    <span className="text-muted-foreground">Cliente: </span>
                    <span className="font-medium">{sale.client_name || billable.clientName || "Consumidor final"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha: </span>
                    <span>{new Date(billable.date).toLocaleString("es-AR")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CUIT emisor: </span>
                    <span className="font-mono text-xs">{emisorCuitLabel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receptor (ERP): </span>
                    <span className="font-mono text-xs">
                      {clienteLoading
                        ? "Cargando…"
                        : formatCuitMostrar(cliente?.cuil_cuit) || "Consumidor final (sin CUIT)"}
                    </span>
                  </div>
                  {cliente?.tax_condition ? (
                    <div>
                      <span className="text-muted-foreground">Condición fiscal: </span>
                      <span>{formatTaxConditionLabel(cliente.tax_condition)}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <span className="text-muted-foreground">Comprobante a emitir: </span>
                    <TipoComprobanteBadge tipo={form.tipo} />
                    <span className="text-sm">{getTipoComprobanteLabel(form.tipo)}</span>
                    <span className="text-muted-foreground text-xs">
                      · IVA receptor {form.condicionIvaReceptor} (
                      {labelCondicionIvaReceptor(form.condicionIvaReceptor ?? 5)})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Concepto: </span>
                    <span>{conceptoLabel(form.concepto)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Documento receptor: </span>
                    <span className="font-mono text-xs">
                      tipo {form.docTipo ?? "—"} · nro {form.docNro ?? 0}
                    </span>
                  </div>
                </div>
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

              <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {lines.length > 0 && Math.abs(linesSubtotal - totalComprobante) > 0.01 ? (
                    <span>
                      Suma de líneas: {formatCurrency(linesSubtotal)} · Total comprobante:{" "}
                      {formatCurrency(totalComprobante)}
                    </span>
                  ) : (
                    <span>Total a facturar en ARCA</span>
                  )}
                </div>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalComprobante)}</p>
              </div>

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
              onClick={onConfirm}
              disabled={
                isSubmitting ||
                !sale ||
                clienteLoading ||
                linesLoading ||
                lines.length === 0
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
