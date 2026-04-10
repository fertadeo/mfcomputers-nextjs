"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, CheckCircle2, Link2, Loader2, Save } from "lucide-react"
import { useLinkWooCommerceIds } from "@/app/hooks/useLinkWooCommerceIds"
import {
  type LinkWooCommerceIdsSummary,
  type WooCommerceUnmatchedErpItem,
  importWooCommerceProductsAsDraft,
  type WooCommerceDraftImportItem,
} from "@/lib/api"
import { useToast } from "@/contexts/ToastContext"

function buildUnmatchedRowKey(row: WooCommerceUnmatchedErpItem, index: number): string {
  return `wc-${row.woocommerce_id ?? "none"}-sku-${row.sku ?? ""}-i-${index}`
}

interface LinkWooCommerceIdsButtonProps {
  onCompleted?: (summary: LinkWooCommerceIdsSummary) => void
  disabled?: boolean
  showSummary?: boolean
}

export function LinkWooCommerceIdsButton({
  onCompleted,
  disabled = false,
  showSummary = true,
}: LinkWooCommerceIdsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const { execute, loading, error, result, reset } = useLinkWooCommerceIds()
  const { showToast } = useToast()

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open && !loading && !result) {
      reset()
    }
  }

  const [handleOpenChangeWithConfirm, confirmDialog] = useConfirmBeforeClose(handleOpenChange)

  const handleConfirm = async () => {
    const data = await execute()
    if (!data) {
      return
    }

    setLastRunAt(new Date().toISOString())
    setIsDialogOpen(false)
    showToast({
      message: `Vinculación completada: ${data.linked} nuevos, ${data.already_linked} ya vinculados, ${data.not_found_in_erp} sin coincidencia`,
      type: "success",
    })
    onCompleted?.(data)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        disabled={loading || disabled}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Vinculando…
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            Vincular con WooCommerce
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChangeWithConfirm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular productos con WooCommerce</DialogTitle>
            <DialogDescription>
              El ERP intentará completar el <code>woocommerce_id</code> cruzando por SKU (y por ID de
              WC cuando el backend lo soporte). El proceso puede tardar varios segundos si hay muchos
              productos pendientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              • Los productos ya vinculados se mantienen sin cambios. <br />
              • Si en WooCommerce hay un SKU que no existe en el ERP, o un producto **sin SKU** en la
              tienda, no habrá coincidencia: podés elegir esos artículos en el listado posterior e
              importarlos como borrador en el ERP.
            </p>
            <p className="font-medium text-foreground">
              ¿Deseás ejecutar la vinculación ahora?
            </p>
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Ejecutar vinculación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}

      {showSummary && result && (
        <LinkWooCommerceSummary summary={result} lastRunAt={lastRunAt} />
      )}
    </div>
  )
}

export function LinkWooCommerceSummary({
  summary,
  lastRunAt,
  onDraftImportCompleted,
}: {
  summary: LinkWooCommerceIdsSummary
  lastRunAt?: string | null
  /** Tras crear borradores en el ERP (p. ej. recargar listado de productos). */
  onDraftImportCompleted?: () => void | Promise<void>
}) {
  const { showToast } = useToast()
  const details = summary.not_found_in_erp_details
  const hasDetailRows = Array.isArray(details) && details.length > 0
  const showOrphansBlock = summary.not_found_in_erp > 0
  const withoutWcSku =
    typeof summary.not_found_in_erp_without_wc_sku === "number"
      ? summary.not_found_in_erp_without_wc_sku
      : undefined

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [draftSaving, setDraftSaving] = useState(false)

  useEffect(() => {
    setSelectedKeys(new Set())
  }, [summary])

  const rowKeys = useMemo(
    () => (hasDetailRows ? details!.map((row, i) => buildUnmatchedRowKey(row, i)) : []),
    [details, hasDetailRows]
  )

  const allSelected = rowKeys.length > 0 && rowKeys.every((k) => selectedKeys.has(k))
  const someSelected = rowKeys.some((k) => selectedKeys.has(k))

  const toggleRow = useCallback((key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedKeys(new Set())
    else setSelectedKeys(new Set(rowKeys))
  }, [allSelected, rowKeys])

  const rowSkuMissing = (row: WooCommerceUnmatchedErpItem) =>
    row.sku_missing_in_wc === true || !(row.sku?.trim() ?? "")

  const handleSaveDrafts = async () => {
    if (!hasDetailRows || !details) return
    const items: WooCommerceDraftImportItem[] = []
    details.forEach((row, i) => {
      const key = buildUnmatchedRowKey(row, i)
      if (!selectedKeys.has(key)) return
      items.push({
        woocommerce_id: row.woocommerce_id,
        sku: row.sku,
        name: row.name,
        sku_missing_in_wc: row.sku_missing_in_wc,
      })
    })
    if (items.length === 0) {
      showToast({ message: "Seleccioná al menos una fila para importar.", type: "error" })
      return
    }
    try {
      setDraftSaving(true)
      const data = await importWooCommerceProductsAsDraft(items)
      const errPart =
        data.errors.length > 0 ? ` ${data.errors.length} avisos en la respuesta.` : ""
      showToast({
        message: `Borradores: ${data.created} creados, ${data.skipped} omitidos.${errPart}`,
        type: "success",
      })
      setSelectedKeys(new Set())
      await onDraftImportCompleted?.()
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "No se pudieron guardar los borradores",
        type: "error",
      })
    } finally {
      setDraftSaving(false)
    }
  }

  return (
    <Card className="border border-muted">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Vinculación completada
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <SummaryBadge label="Nuevos vinculados" value={summary.linked} variant="success" />
          <SummaryBadge label="Ya vinculados" value={summary.already_linked} variant="muted" />
          <SummaryBadge
            label="Sin coincidencia en ERP"
            value={summary.not_found_in_erp}
            variant="warning"
          />
          <SummaryBadge label="Procesados" value={summary.total_processed} variant="info" />
          {withoutWcSku != null && withoutWcSku > 0 && (
            <SummaryBadge
              label="Sin SKU en WooCommerce (entre esos)"
              value={withoutWcSku}
              variant="warning"
            />
          )}
        </div>
        {summary.errors.length > 0 && (
          <p className="text-xs text-amber-700">
            Se registraron {summary.errors.length} errores. Revisá el backend para más detalles.
          </p>
        )}
        {showOrphansBlock && (
          <div className="space-y-3 rounded-md border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/25">
            <p className="font-medium text-foreground">
              Productos en WooCommerce sin alta en el ERP
            </p>
            {hasDetailRows ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Marcá los artículos a importar como borrador en el ERP. La columna «Sin SKU WC»
                  indica productos en la tienda sin SKU (el backend puede generar código al crear el
                  borrador).
                </p>
                <div className="max-h-56 overflow-auto rounded-md border border-border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 p-2">
                          <Checkbox
                            checked={
                              allSelected ? true : someSelected ? "indeterminate" : false
                            }
                            onCheckedChange={() => toggleAll()}
                            aria-label="Seleccionar todos"
                          />
                        </TableHead>
                        <TableHead className="w-[20%]">SKU</TableHead>
                        <TableHead className="w-[12%] text-center">Sin SKU WC</TableHead>
                        <TableHead className="w-[14%]">ID WC</TableHead>
                        <TableHead>Nombre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details!.map((row, i) => {
                        const key = buildUnmatchedRowKey(row, i)
                        return (
                          <TableRow key={key}>
                            <TableCell className="p-2 align-middle">
                              <Checkbox
                                checked={selectedKeys.has(key)}
                                onCheckedChange={(v) => toggleRow(key, v === true)}
                                aria-label={`Seleccionar ${row.name ?? row.sku ?? "producto"}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {row.sku?.trim() ? row.sku : "—"}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {rowSkuMissing(row) ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Sí
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {row.woocommerce_id != null ? row.woocommerce_id : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.name?.trim() ? row.name : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selectedKeys.size} seleccionado{selectedKeys.size === 1 ? "" : "s"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 w-full sm:w-auto"
                    disabled={draftSaving || selectedKeys.size === 0}
                    onClick={() => void handleSaveDrafts()}
                  >
                    {draftSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar seleccionados en borrador (ERP)
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hay {summary.not_found_in_erp} caso
                {summary.not_found_in_erp === 1 ? "" : "s"} sin coincidencia (incluye productos en WC
                con SKU pero sin par en el ERP, y con productos **sin SKU** en la tienda). Para ver el
                detalle fila a fila y poder importar, el backend debe incluir{" "}
                <code className="rounded bg-muted px-1 text-[11px]">not_found_in_erp_details</code> y{" "}
                <code className="rounded bg-muted px-1 text-[11px]">
                  not_found_in_erp_without_wc_sku
                </code>
                .
              </p>
            )}
          </div>
        )}
        {lastRunAt && (
          <p className="text-xs text-muted-foreground">
            Última ejecución: {new Date(lastRunAt).toLocaleString("es-AR")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface SummaryBadgeProps {
  label: string
  value: number
  variant: "success" | "muted" | "warning" | "info"
}

function SummaryBadge({ label, value, variant }: SummaryBadgeProps) {
  const variantClasses: Record<SummaryBadgeProps["variant"], string> = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    muted: "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Badge
        variant="secondary"
        className={`text-sm font-semibold ${variantClasses[variant]}`}
      >
        {value.toLocaleString("es-AR")}
      </Badge>
    </div>
  )
}
