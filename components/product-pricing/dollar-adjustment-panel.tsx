"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, DollarSign, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import {
  applyDollarPriceAdjustmentWithMessage,
  formatArs,
  getDollarRate,
  previewDollarPriceAdjustment,
  type DollarRateData,
} from "@/lib/product-pricing"

interface DollarAdjustmentPanelProps {
  onApplied?: () => void
}

export function DollarAdjustmentPanel({ onApplied }: DollarAdjustmentPanelProps) {
  const { showToast } = useToast()
  const [info, setInfo] = useState<DollarRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [syncWoo, setSyncWoo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDollarRate()
      setInfo(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar cotización"
      setError(msg)
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRate()
  }, [loadRate])

  const loadExtendedPreview = async () => {
    setLoading(true)
    try {
      const data = await previewDollarPriceAdjustment({ preview_limit: 15 })
      setInfo(data)
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Error en vista previa",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const runApply = async () => {
    if (!info) return
    const msg = info.is_first_adjustment
      ? "¿Guardar la cotización actual como referencia? Los precios no se modificarán."
      : info.products_affected_estimate === 0 || info.increment_percent === 0
        ? "¿Actualizar la referencia del dólar? No hay variación que aplicar a precios."
        : `¿Aplicar un incremento del ${info.increment_percent.toFixed(2)}% a aproximadamente ${info.products_affected_estimate} productos?`
    if (!window.confirm(msg)) return

    setApplying(true)
    try {
      const { data, message } = await applyDollarPriceAdjustmentWithMessage({
        sync_to_woocommerce: syncWoo,
      })
      let detail = message
      if (data.woocommerce_sync && syncWoo) {
        detail += ` · WooCommerce: ${data.woocommerce_sync.synced} ok`
        if (data.woocommerce_sync.failed > 0) {
          detail += `, ${data.woocommerce_sync.failed} fallidos`
        }
      }
      showToast({ message: detail, type: "success", duration: 6000 })
      await loadRate()
      onApplied?.()
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Error al aplicar",
        type: "error",
      })
    } finally {
      setApplying(false)
    }
  }

  const applyLabel = info?.is_first_adjustment
    ? "Establecer referencia"
    : "Aplicar ajuste por dólar"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Ajuste por variación del dólar (ARS)
        </CardTitle>
        <CardDescription>
          Cotización Argentina vía DolarAPI. La aplicación es manual: no hay actualización automática
          en segundo plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRate()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar cotización
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadExtendedPreview()}
            disabled={loading || !!error}
          >
            Vista previa ampliada
          </Button>
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !info ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Obteniendo cotización…
          </div>
        ) : info ? (
          <>
            {info.is_first_adjustment && (
              <p className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
                La primera vez que confirmes solo se guardará la cotización de referencia; los
                precios no cambiarán.
              </p>
            )}

            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Tipo de dólar</dt>
                <dd className="font-medium">{info.quote.dollar_label}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cotización actual (venta)</dt>
                <dd className="font-medium tabular-nums">{formatArs(info.current_rate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Última referencia guardada</dt>
                <dd className="font-medium tabular-nums">
                  {info.reference_rate != null ? formatArs(info.reference_rate) : "— (primera vez)"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Incremento estimado</dt>
                <dd className="font-medium tabular-nums">
                  {info.increment_percent.toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Productos estimados</dt>
                <dd className="font-medium tabular-nums">{info.products_affected_estimate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fuente / actualizado</dt>
                <dd className="text-xs text-muted-foreground">
                  {info.quote.source} ·{" "}
                  {new Date(info.quote.fetched_at).toLocaleString("es-AR")}
                </dd>
              </div>
            </dl>

            {info.sample_preview.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {info.sample_preview.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatArs(row.current_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatArs(row.new_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={syncWoo} onCheckedChange={(v) => setSyncWoo(v === true)} />
              Sincronizar con WooCommerce al aplicar
            </label>

            <Button type="button" onClick={() => void runApply()} disabled={!info || loading || applying}>
              {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {applyLabel}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
