"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Link2, Loader2 } from "lucide-react"
import { useLinkWooCommerceIds } from "@/app/hooks/useLinkWooCommerceIds"
import { type LinkWooCommerceIdsSummary } from "@/lib/api"
import { useToast } from "@/contexts/ToastContext"

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

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular productos con WooCommerce</DialogTitle>
            <DialogDescription>
              El ERP consultará WooCommerce por SKU para completar el{" "}
              <code>woocommerce_id</code> de los productos que todavía no lo tengan. El proceso puede
              tardar varios segundos si hay muchos productos pendientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              • Los productos ya vinculados se mantienen sin cambios. <br />
              • Los que no existan en WooCommerce se informan como "no encontrados".
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

      {showSummary && result && (
        <LinkWooCommerceSummary summary={result} lastRunAt={lastRunAt} />
      )}
    </div>
  )
}

export function LinkWooCommerceSummary({
  summary,
  lastRunAt,
}: {
  summary: LinkWooCommerceIdsSummary
  lastRunAt?: string | null
}) {
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
            label="Sin coincidencia"
            value={summary.not_found_in_erp}
            variant="warning"
          />
          <SummaryBadge label="Procesados" value={summary.total_processed} variant="info" />
        </div>
        {summary.errors.length > 0 && (
          <p className="text-xs text-amber-700">
            Se registraron {summary.errors.length} errores. Revisá el backend para más detalles.
          </p>
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
